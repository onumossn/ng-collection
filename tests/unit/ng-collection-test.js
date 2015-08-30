describe

beforeEach(module('ngCollection'));

describe('$collection', function () {
  // var $httpBackend;

  // beforeEach(inject(function(_$httpBackend_) {
  //   $httpBackend = _$httpBackend_;
  // }));

  // afterEach(function() {
  //   $httpBackend.verifyNoOutstandingRequest();
  //   $httpBackend.verifyNoOutstandingExpectation();
  // });

  it('should ensure only a single instance for each unique resource and params set pair', function() {

  });

  it('should POST when no id exists on entity', function() {

  });

  it('should PUT when id exists on entity', function() {

  });

  it('should GET a collection with included params', function() {

  });

  it('should GET by id when an id param is given', function() {

  });

  it('should update the local collection on GET, PUT, POST, and DELETE', function() {

  });

  it('should reject the defer with an error on failures', function() {

  });

  it('should use an authorization service if provided', function() {

  });
});

/****************************************************************************/

describe('$resourceLibrary', function () {

  beforeEach(inject(function() {

  }));

  it('should get a resource for a given key', function() {

  });

  it('should accept an object for extending the resources library', function() {

  });

  it('should accept an array of objects for extending resources library', function() {

  });

  it('should set the key of the resource relative to the provided base', function() {

  });
});

/****************************************************************************/

describe('ngCollectionCtrl', function () {
  var $scope,
    $controller,
    $rootScope,
    $collection,
    mockAttrs = [ { resource: 'ASDF', params: { c: 'd' } },
      { resource: 'HelloBye', params: {} } ];

  beforeEach(module(function($provide) {
    $provide.factory('$collection', function($q) {
      var collections = {};

      return function(key) {
        if (!collections[key]) {
          collections[key] = {
            data: { collection: [] },
            get: jasmine.createSpy('get').and.returnValue($q.resolve(true)),
            save: jasmine.createSpy('save').and.returnValue($q.resolve(true)),
            remove: jasmine.createSpy('remove').and.returnValue($q.resolve(true))
          };
        }
        return collections[key];
      };
    });
  }));

  beforeEach(inject(function(_$rootScope_, _$controller_, _$collection_) {
    $controller = _$controller_;
    $rootScope = _$rootScope_;
    $collection = _$collection_;

    $scope = $rootScope.$new();

    $controller('ngCollectionCtrl', {
      $scope: $scope,
      $attrs: {
        ngCollection: angular.toJson(mockAttrs)
      }
    });
  }));

  it('should add or extend a object with the name camelCase collection name on the scope for each collection', function() {
    expect($scope.aSDF).toBeDefined();
    expect($scope.helloBye).toBeDefined();
  });

  it('should request initial collection', function() {
    expect($collection('ASDF').get).toHaveBeenCalled();
    expect($collection('HelloBye').get).toHaveBeenCalled();
  });

  it('should expose collection data, save, and remove', function() {
    expect($scope.aSDF.data).toEqual(jasmine.any(Object));
    expect($scope.aSDF.save).toEqual(jasmine.any(Function));
    expect($scope.aSDF.remove).toEqual(jasmine.any(Function));
    expect($scope.helloBye.data).toEqual(jasmine.any(Object));
    expect($scope.helloBye.save).toEqual(jasmine.any(Function));
    expect($scope.helloBye.remove).toEqual(jasmine.any(Function));
  });

  it('should call appropriate $collection function on save and remove', function() {
    var entity = { test: 'hi' };
    $scope.aSDF.save(entity);
    expect($collection('ASDF').save).toHaveBeenCalledWith(entity);

    $scope.helloBye.save(entity);
    expect($collection('HelloBye').save).toHaveBeenCalledWith(entity);

    $scope.aSDF.remove(entity);
    expect($collection('ASDF').remove).toHaveBeenCalledWith(entity);

    $scope.helloBye.remove(entity);
    expect($collection('HelloBye').remove).toHaveBeenCalledWith(entity);
  });

  it('should accept success callbacks on save and remove', function() {

  });

  it('should accept error callbacks on save and remove', function() {

  });

});