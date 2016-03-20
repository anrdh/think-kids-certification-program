'use strict';

angular.module('thinkKidsCertificationProgramApp')
.controller('MainCtrl', function ($scope, $http, Auth, $mdToast, MaterialCalendarData, $timeout) {
  $scope.forms = [];
  $scope.submissions = [];
  $scope.submissionFields = [];
  $scope.noClasses = false;
  $scope.viewTimePicker = false;
  const user = Auth.getCurrentUser();

  if(user.callAvail === undefined) {
    user.callAvail = {};
  }

  $timeout(() => {
    $scope.isInstructor = () => {
      const { roles } = user;
      if(roles.indexOf('inst') > -1) {
        return true;
      }
      return false;
    };
  });

  $scope.setDayContent = date => {
    const waitForUserLoad = () => {
      if(typeof user !== 'undefined') {
        date = moment(date).format('MMMM Do, YYYY');
        const { callAvail } = user;
        if(callAvail[date]) {
          let returnStr = '';
          callAvail[date].forEach(timeBlock => {
            const startTime = moment(timeBlock[0]).format('HH:mm');
            const endTime = moment(timeBlock[1]).format('HH:mm');
            returnStr += '<p>' + startTime + ' to ' + endTime + '</p>';
          });
          console.log(returnStr);
          return returnStr;
        }
        return '<p></p>';
      } else {
        setTimeout(() => {
          waitForUserLoad();
        }, 1);
      }
    };
    return waitForUserLoad();
  };

  $scope.showTimePicker = () => {
    $scope.formattedSelectedDate = moment($scope.selectedDate).format('MMMM Do, YYYY');
    $scope.viewTimePicker = true;
    $scope.startTime = undefined;
    $scope.endTime = undefined;
  };

  $scope.setCallAvail = () => {
    const { callAvail } = user;

    if(callAvail[$scope.formattedSelectedDate]) {
      callAvail[$scope.formattedSelectedDate].push([$scope.startTime, $scope.endTime]);
    } else {
      callAvail[$scope.formattedSelectedDate] = [];
      callAvail[$scope.formattedSelectedDate].push([$scope.startTime, $scope.endTime]);
    }

    user.callAvail = callAvail;

    $http.patch('/api/users/'+user._id, user)
      .success(() => {
        MaterialCalendarData.setDayContent($scope.selectedDate, $scope.setDayContent($scope.selectedDate));
        $mdToast.show(
          $mdToast.simple()
            .textContent('Successfully set availability!')
            .hideDelay(3000)
        );
      });
  };


  $http.get('/api/classes')
    .success(function(classes) {
      $scope.classes = classes.filter(function(clas) {
        return clas.students.indexOf(Auth.getCurrentUser().name) > -1 || clas.instructors.indexOf(Auth.getCurrentUser().name) > -1;
      });

      if($scope.classes.length === 0) {
        $scope.noClasses = true;
      }
    });

  updateSubmittedWork();

  function updateSubmittedWork()
  {
    $scope.submissions = [];
    $http.get('/api/forms/mine').success(function(forms) {
      $scope.forms = forms;
      forms.forEach(function(form) {
        form.submittedData.forEach(function(data) {
          if (data.byName == Auth.getCurrentUser().name) {
            var dataProps = Object.getOwnPropertyNames(data);
            var filteredData = [];

            for (var i = 0; i < dataProps.length; i++) {
              if (dataProps[i] === 'byName') {
                continue;
              } else if (dataProps[i] === 'onTime') {
                continue;
              } else {
                var field = {};
                field.prop = dataProps[i];
                field.val = data[dataProps[i]];
                filteredData.push(field);
              }
            }
            $scope.submissions.push({
              name: form.name + ' - ' + moment.unix(data.onTime).fromNow(),
              fields: filteredData,
              form: form
            });
          }
        });
      });
    });
  }

  $scope.viewSubmission = function(submission, index) {
    $scope.cancelForm();
    $scope.selectedSubmission = index;
    var feedback = $scope.submissions[index].fields.filter(function (field) {
      return (field.prop === 'feedback');
    });

    if (feedback[0]) {
      $scope.feedback = feedback[0].val;
    }
    
    $scope.submissionFields = $scope.submissions[index].fields.filter(function (field) {
      return (field.prop !== 'feedback');
    });
    console.log($scope.feedback);
    console.log($scope.submissionFields);
  };

  function cancelSubmission() {
    $scope.selectedSubmission = null;
    $scope.submissionFields = [];
  }

  $scope.viewForm = function(form, index) {
    cancelSubmission();
    $scope.selectedForm = index;
    $scope.form = {};
    $scope.form.btnSubmitText = form.data[0].btnSubmitText;
    $scope.form.btnCancelText = form.data[0].btnCancelText;
    $scope.form.fieldsModel = form.data[0].edaFieldsModel;
    $scope.form.dataModel = {};
  };

  $scope.submitForm = function() {
    var form = $scope.forms[$scope.selectedForm];
    var formFieldsData = form.data[0].edaFieldsModel;
    var formSubmittedDataProps = Object.getOwnPropertyNames($scope.form.dataModel);
    var formSubmittedData = {};

    // Name all fields with their labels instead of random IDs
    for (var i = 0; i < formSubmittedDataProps.length; i++) {
      for (var x = 0; x < formFieldsData.length; x++) {
        for (var y = 0; y < formFieldsData[x].columns.length; y++) {
          if (formFieldsData[x].columns[y].control.key === formSubmittedDataProps[i]) {
            formSubmittedData[formFieldsData[x].columns[y].control.templateOptions.label] = $scope.form.dataModel[formSubmittedDataProps[i]];
          }
        }
      }
    }

    formSubmittedData.onTime = moment().unix();
    formSubmittedData.byName = Auth.getCurrentUser().name;
    formSubmittedData.Date = moment(Date.parse(formSubmittedData.Date)).format('MMMM Do YYYY');

    console.log('Submitting form data', formSubmittedData);
    $http.patch('/api/forms/' + form._id, {
        submittedData: formSubmittedData
      })
      .success(function() {
        $scope.selectedForm = null;
        $scope.form = {};
        $scope.form.dataModel = {};
        updateSubmittedWork();
      });
  };

  $scope.cancelForm = function() {
    $scope.selectedForm = null;
    $scope.form = {};
    $scope.form.dataModel = {};
  };
});
