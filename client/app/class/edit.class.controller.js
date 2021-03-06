'use strict';

angular.module('thinkKidsCertificationProgramApp')
  .controller('editClassCtrl', function ($scope, $http, $location, $stateParams, Heading) {

    $http.get('/api/classes/'+$stateParams.id)
      .success(clas => {
        $scope.class = clas;

        Heading.setHeading('Admin Panel > Edit ' + clas.name);

        $http.get('/api/users')
          .success(users => {
            $http.get('/api/roles')
              .success(roles => {

                roles = roles.filter(role => role.instructor || role.name === 'Admin')
                             .map(role => role.name);

                $scope.instructors = users.filter(user => {
                  return user.roles.filter(role => {
                    return roles.indexOf(role) > -1 && role !== 'Admin';
                  }).length > 0;
                }).map(user => {
                  user.inClass = false;
                  if($scope.class.instructors.indexOf(user.name) > -1) {
                    user.inClass = true;
                  }
                  return user;
                });

                $scope.users = users.filter(user => {
                  return user.roles.filter(role => {
                    return roles.indexOf(role) !== -1;
                  }).length === 0;
                }).map(user => {
                  user.inClass = false;
                  if($scope.class.students.indexOf(user.name) > -1) {
                    user.inClass = true;
                  }
                  return user;
                });

              });
          });
      });


    $scope.saveClass = () => {
      const instructors = $scope.instructors.filter(instructor => instructor.inClass);
      const instructorNames = instructors.map(instructor => instructor.name);

      let users = $scope.users.filter(user => user.inClass);
      const userNames = users.map(user => user.name);
      users = users.concat(instructors);
      users.forEach(user => user.classes.push($scope.class.name));
      const userIDs = users.map(user => user._id);

      $http.patch('/api/classes/'+$scope.class._id, {name: $scope.class.name, instructors: instructorNames, students: userNames});

      for(let i = 0; i < userIDs.length; i++) {
        $http.patch('/api/users/' + userIDs[i], users[i]);
      }

      $location.path('/admin');
    };
  });
