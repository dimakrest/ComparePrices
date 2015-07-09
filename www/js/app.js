// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('ComparePrices', ['ionic', 'ComparePrices.controllers', 'ComparePrices.services'])

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


    // Need to add myCart -> this is a default page
.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider

        .state('tabs', {
            url: "/tab",
            abstract: true,
            templateUrl: "templates/tabs.html"
        })

//        .state('tabs.createCart', {
//            url: "/createCart",
//            views: {
//                'tabCreateCart': {
//                    templateUrl: "templates/edit_cart.html",
//                    controller: 'MyCartCtrl'
//                }
//            }
//        })

        .state('tabs.editCart', {
            url: "/editCart",
            views: {
                'tabMyCart': {
                    templateUrl: "templates/edit_cart.html",
                    controller: 'EditCartCtrl'
                }
            }
        })

        .state('tabs.myCart', {
            url: "/myCart",
            views: {
                'tabMyCart': {
                    templateUrl: "templates/my_cart.html",
                    controller: 'MyCartCtrl'
                }
            }
        })

        .state('tabs.recipes', {
            url: "/recipes",
            views: {
                'tabRecipes': {
                    templateUrl: "templates/recipes.html",
                    controller: 'RecipesListCtrl'
                }
            }
        })

        .state('tabs.recipe', {
            url: "^/tab/recipes/:recipe",
            views: {
                'tabRecipes': {
                    templateUrl: "templates/recipe.html",
                    controller: 'RecipeCtrl'
                }
            }
        })

        //.state('recipe', {
        //    url: "^/tab/recipes/:recipe",
        //    templateUrl: "templates/recipe.html",
        //    controller: 'RecipeCtrl'
        //});

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/tab/myCart');
});
