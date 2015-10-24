// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('ComparePrices', ['ionic', 'ionic-material', 'ngCordova', 'ComparePrices.controllers', 'ComparePrices.services', 'ComparePrices.constants', 'jett.ionic.filter.bar', 'ngIOS9UIWebViewPatch'])

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
.directive('googleAutocomplete', ['$rootScope', 'UpdateStores', '$cordovaGoogleAnalytics', function($rootScope, UpdateStores, $cordovaGoogleAnalytics) {
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

                $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                var full_address = place.formatted_address.replace(", ישראל", "");
                // we check how many commas there are in the string. If no commas it means we don't have street there
                // as we always have format "Israel, city". It means we have bad address and user inserted some place, so we will take also name
                // Second part of if is corner case for entering city, for example Netanya.
                if (((full_address.match(/,/g) || []).length == 0) && (full_address != place.name))
                {
                    $scope.c.lastAddress = full_address + ', ' + place.name;
                }
                else
                {
                    $scope.c.lastAddress = full_address;
                }

                if ((localStorage.getItem('IsRunningOnDevice') || "0") != "0") {
                    $cordovaGoogleAnalytics.trackEvent('Settings', 'Change address', $scope.c.lastAddress, $scope.c.rangeForShops);
                }
                localStorage.setItem('lastAddress', $scope.c.lastAddress);
                var latLonKeys = Object.keys(place.geometry.location)
                var myLat = place.geometry.location.lat();
                var myLon = place.geometry.location.lng();
                localStorage.setItem('Lat', myLat);
                localStorage.setItem('Lon', myLon);

                // No need to check for internet connection - if there's no internet user cannot use google autocomplete
                UpdateStores.UpdateStoresInfo($scope, myLat, myLon, $scope.c.rangeForShops).then(function () {
                    $scope.c.HideLoading();
                    // Change the useUsersCurrentLocation variable, so we know that now we should use address from google autocompletion
                    $scope.c.useUsersCurrentLocation = false;
                    localStorage.setItem('UseUsersCurrentLocation', 0);
                });
            });
        }
    }
}])
    // Need to add myCart -> this is a default page
.config(function($stateProvider, $urlRouterProvider, $ionicFilterBarConfigProvider, $ionicConfigProvider) {
    $stateProvider

        .state('tabs', {
            url: "/tab",
            abstract: true,
            templateUrl: "templates/tabs.html"
        })

        .state('tabs.myCarts', {
            url: "/myCarts",
            cache: false,
            views: {
                'tabMyCarts': {
                templateUrl: "templates/my_carts.html",
                controller: 'MyCartsCtrl',
                    resolve: {
                        "CreateMyCarts": function (ComparePricesStorage, PrepareInfoForControllers)
                        {
                            var firstTimeLoad = localStorage.getItem('firstTimeLoad') || 1;
                            return PrepareInfoForControllers.MyCartsInit(firstTimeLoad);
                        }}
                }
            }
        })

        // Don't cache this state and tabs.productGroups - there's some bug with caching and search bar. Cached view is updated(at least) tries to update and we get an error
        .state('tabs.cartDetails', {
            url: "/myCarts/cartDetails/:cartID",
            cache: false,
            views: {
                'tabMyCarts': {
                    templateUrl: "templates/cart_details.html",
                    controller: 'CartDetailsCtrl',
                    resolve: {
                        "InitMyCart" : function(PrepareInfoForControllers, $stateParams) {
                            return PrepareInfoForControllers.InitMyCart($stateParams.cartID);
                        }
                    }
                }
            }
        })

        .state('tabs.cartDetailsSearchBar', {
            url : "/searchBarCartDetails",
            views : {
                'tabMyCarts' : {
                    templateUrl: "templates/search_bar.html",
                    controller: 'SearchBarCtrl'
                }
            }
        })

        .state('tabs.productGroups', {
            url: "/productGroups",
            cache: false,
            views: {
                'tabProducts': {
                    templateUrl: "templates/product_groups.html",
                    controller: 'ProductGroupsCtrl',
                    resolve: {
                        "InitPredefinedProducts": function (PrepareInfoForControllers)
                        {
                            return PrepareInfoForControllers.InitProductGroups();
                        }}
                }
            }
        })

        .state('tabs.products', {
            url: "/productGroups/:productGroupID/:subProductGroupID",
            views: {
                'tabProducts': {
                    templateUrl: "templates/products.html",
                    controller: 'ProductsCtrl'
                }
            }
        })

        .state('tabs.productGroupsSearchBar', {
            url : "/searchBarProductGroups",
            views : {
                'tabProducts' : {
                    templateUrl: "templates/search_bar.html",
                    controller: 'SearchBarCtrl'
                }
            }
        });

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/tab/myCarts');

    // placeholder for a search bar
    $ionicFilterBarConfigProvider.placeholder(document.localize.strings['SearchQueryCartDetailsPlaceholder']);

    // Change android default params => make the app ios style(prettier)
    // for android make the tabs to be at the bottom
    $ionicConfigProvider.tabs.style('standard').position('bottom');
    $ionicConfigProvider.navBar.alignTitle('center').positionPrimaryButtons('left');
    });
