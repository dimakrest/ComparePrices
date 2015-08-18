// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('ComparePrices', ['ionic', 'ionic-material', 'ngCordova', 'ComparePrices.controllers', 'ComparePrices.services', 'ComparePrices.constants'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
})

    //////////////// Location calculation + auto complete /////////////////
.directive('googleAutocomplete', ['$rootScope', 'ComparePricesStorage', function($rootScope, ComparePricesStorage) {
    return {
        restrict: 'E',
        replace: 'false',
        templateUrl: 'templates/google_autocomplete.html',
        link: function($scope, elm, attrs) {
            var input = elm.children()[1];
            var autocomplete = new google.maps.places.Autocomplete(input);
            google.maps.event.addListener(autocomplete, 'place_changed', function () {
                var place = autocomplete.getPlace();

                if (!place.geometry) {
                    // TODO: chamge error message
                    window.alert("Autocomplete's returned place contains no geometry");
                    return;
                }

                ComparePricesStorage.UpdateStoreRadiusFromLocations(place.geometry.location.G,
                    place.geometry.location.K);
                $scope.c.lastAddress = place.formatted_address;
                localStorage.setItem('lastAddress', $scope.c.lastAddress)
            });
        }
    }
}])

    // Need to add myCart -> this is a default page
.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider

        .state('tabs', {
            url: "/tab",
            abstract: true,
            templateUrl: "templates/tabs.html"
        })

        .state('tabs.myCarts', {
            url: "/myCarts",
            views: {
                'tabMyCarts': {
                templateUrl: "templates/my_carts.html",
                controller: 'MyCartsCtrl'
                }
            }
        })

        // TODO: Do I need here a new view? How I can do this if I use here another nav view, nothing works
        .state('tabs.cartDetails', {
            url: "/myCarts/cartDetails/:cartID",
            views: {
                'tabMyCarts': {
                    templateUrl: "templates/cart_details.html",
                    controller: 'CartDetailsCtrl'
                }
            }
        })

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/tab/myCarts');
});
