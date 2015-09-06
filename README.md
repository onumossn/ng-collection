#ng-restful-collection [![Circle CI](https://img.shields.io/circleci/project/onumossn/ng-restful-collection/master.svg)](https://circleci.com/gh/onumossn/ng-restful-collection)

## Status: In-Development


##<a name="install"></a> Install
* <a name="manual"></a>**Manual** (Better method on release): `download this repo`
* <a name="bower"></a>**Bower** (TODO): `bower install ng-restful-collection --save`
* <a name="npm"></a>**NPM** (TODO): `npm install ng-restful-collection`
```html
<script src="angular(.min).js"></script>
<script src="ng-restful-collection(.min).js"></script>
```


##<a name="usage"></a> Usage
html:
```html
<script src="angular.min.js"></script>
<script src="ng-restful-collection.min.js"></script>

<div ng-app="TodoList" ng-controller="TodoCtrl" ng-restful-collection="[{type: 'TodoResource'}]">
  <ul>
    <li ng-repeat="todo in todoResource.data.collection">
      <span>{{todo.title}}</span>
      <button ng-click="todo.edit != todo.edit">Edit</button>
      <button ng-click="todoResource.remove(todo)">Remove</button>
      <form ng-if="todo.edit" ng-init="todoCopy = getEditCopy(todo)" name="editForm">
        <label>
          <span>Todo:</span>
          <input type="text" name="todo" ng-model="todo.name" title="Todo" required/> 
        </label>
        <button type="submit" ng-click="editForm.$valid && todoResource.save(todoCopy, showConfirmation, showError)">Save</button>
      </form>
    </li>
  </ul>

  <form name="addForm">
    <label>
      <span>Todo:</span>
      <input type="text" name="todo" ng-model="newTodo.name" required/>
    </label>
    <button type="submit" ng-click="addForm.$valid && todoResource.save(newTodo, showConfirmation, showError)">Save</button>
  </form>
</div>
```
Javascript:
```js
//inject directives and services.
var app = angular.module('TodoList', ['ngRestfulCollection'])
  .config(function($resourceLibraryProvider) {
    $resourceLibraryProvider.defaults.baseLinks = {
      TodoResource: '<RESTful resource url>'
    };
  }).controller('TodoCtrl', function($scope) {
    $scope.showConfirmation = function(data) {
      alert('Todo ' + data.name + ' has been created');
    };
    
    $scope.showError = function(error) {
      alert(error.message);
    };
  });
```
