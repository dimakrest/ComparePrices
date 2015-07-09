angular.module('ComparePrices.controllers', [])

    .controller('AppCtrl', function($scope, $ionicModal, $timeout) {

      // With the new view caching in Ionic, Controllers are only called
      // when they are recreated or on app start, instead of every page change.
      // To listen for when this page is active (for example, to refresh data),
      // listen for the $ionicView.enter event:
      //$scope.$on('$ionicView.enter', function(e) {
      //});

      // Form data for the login modal
      $scope.loginData = {};

      // Create the login modal that we will use later
      $ionicModal.fromTemplateUrl('templates/login.html', {
        scope: $scope
      }).then(function(modal) {
        $scope.modal = modal;
      });

      // Triggered in the login modal to close it
      $scope.closeLogin = function() {
        $scope.modal.hide();
      };

      // Open the login modal
      $scope.login = function() {
        $scope.modal.show();
      };

      // Perform the login action when the user submits the login form
      $scope.doLogin = function() {
        console.log('Doing login', $scope.loginData);

        // Simulate a login delay. Remove this and replace with your login
        // code if using a login system
        $timeout(function() {
          $scope.closeLogin();
        }, 1000);
      };
    })

    .controller('RootCtrl', function($scope) {
        $scope.c = {}

        $scope.c.myCart      = []
        $scope.c.allProducts = []
    })

    .controller('SuggestedCtrl', function() {
        console.log("Here")
    })

    .controller('EditCartCtrl', function($scope,ComparePricesStorage) {
        $scope.searchQuery = ""

        ComparePricesStorage.GetAllProducts(function(result) {
            $scope.c.allProducts = result.rows
        })

        $scope.clearSearch = function()
        {
            $scope.searchQuery = ""
        }

        // TODO: maybe there's a prettier way, no need to change the entire cart
        $scope.ItemWasClicked = function(clickedItem) {
            var numOfProductsInCart = $scope.c.myCart.length
            var productIndex        = -1
            for (var i=0; i < numOfProductsInCart; i++) {
                if ($scope.c.myCart[i]['ItemCode'] == clickedItem['ItemCode']) {
                    productIndex = i
                    break;
                }
            }
            if (productIndex == -1) {
                var newItemInCart = {'CartID': 1,
                    'ItemCode': clickedItem['ItemCode'],
                    'ItemName': clickedItem['ItemName'],
                    'Amount': 1}
                $scope.c.myCart.push(newItemInCart)
            } else {
                $scope.c.myCart[i]['Amount']++
            }

            ComparePricesStorage.UpdateCart($scope.c.myCart)
        }
    })

    .controller('MyCartCtrl', function($scope, ComparePricesStorage) {

        // ionic related variables. Used to create advanced  <ion-list>
        $scope.shouldShowDelete = false;
        $scope.shouldShowReorder = false;
        $scope.listCanSwipe = true

        $scope.searchQuery = ""

        $scope.clearSearch = function()
        {
            $scope.searchQuery = ""
        }

        ComparePricesStorage.GetMyCart(function(result) {
            $scope.$apply(function() {
                $scope.c.myCart = result.rows
            });
        })

        $scope.FindBestShop = function() {
            // At first get from myCart only ItemCodes
            var productCodesInMyCart = []
            $scope.c.myCart.forEach(function(singleItem) {
                productCodesInMyCart.push(singleItem['ItemCode'])
            });

            ComparePricesStorage.GetProductsForEachShopByItemCode(productCodesInMyCart, function(result) {

                var priceInAmPM = 0.0;
                result['AM_PM'].rows.forEach(function(product) {
                    var numOfProductsInCart = $scope.c.myCart.length
                    var amount = 0
                    for (var i=0; i < numOfProductsInCart; i++) {
                        if ($scope.c.myCart[i]['ItemCode'] == product['ItemCode']) {
                            amount = parseInt($scope.c.myCart[i]['Amount'])
                            break;
                        }
                    }
                    priceInAmPM += parseFloat(product['ItemPrice']) * amount
                });

                var priceInMega = 0.0;
                result['Mega'].rows.forEach(function(product) {
                    var numOfProductsInCart = $scope.c.myCart.length
                    var amount = 0
                    for (var i=0; i < numOfProductsInCart; i++) {
                        if ($scope.c.myCart[i]['ItemCode'] == product['ItemCode']) {
                            amount = parseInt($scope.c.myCart[i]['Amount'])
                            break;
                        }
                    }
                    priceInMega += parseFloat(product['ItemPrice']) * amount
                });

                var priceInSuperSal = 0.0;
                result['SuperSal'].rows.forEach(function(product) {
                    var numOfProductsInCart = $scope.c.myCart.length
                    var amount = 0
                    for (var i=0; i < numOfProductsInCart; i++) {
                        if ($scope.c.myCart[i]['ItemCode'] == product['ItemCode']) {
                            amount = parseInt($scope.c.myCart[i]['Amount'])
                            break;
                        }
                    }
                    priceInSuperSal += parseFloat(product['ItemPrice']) * amount
                });

                ComparePricesStorage.GetStoresInRadius(15, function(storesInRadius) {
                    var alertMessage = "AM_PM Price: " + priceInAmPM + "\n" +
                                        "Mega Price: " + priceInMega + "\n" +
                                        "SuperSal Price: " + priceInSuperSal + "\nStores near you: \n"

                    storesInRadius.rows.forEach(function(singleStore) {
                        alertMessage += "Store Name " + singleStore['StoreName'] + ", Distance to store: " + singleStore['Distance'] + "\n"
                    })
                    alert(alertMessage)
                })
            });
        }

        $scope.ClearMyCart = function() {
            $scope.c.myCart = []
            ComparePricesStorage.ClearMyCart()
        }

        $scope.DeleteProduct = function(product) {
            var numOfProductsInCart = $scope.c.myCart.length
            var productIndex        = -1
            for (i=0; i < numOfProductsInCart; i++) {
                if ($scope.c.myCart[i]['ItemCode'] == product['ItemCode']) {
                    productIndex = i
                    break;
                }
            }
            if (productIndex != -1) {
                $scope.c.myCart.splice(productIndex, 1)
            }
            ComparePricesStorage.UpdateCart($scope.c.myCart)
        }

        $scope.ToggleDeleteValue = function() {
            $scope.shouldShowDelete = !$scope.shouldShowDelete;
        }
     })

    .controller('RecipesListCtrl', ['$scope', 'Recipes',
        function($scope, Recipes) {
            $scope.recipes = Recipes.query();
    }])

    .controller('RecipeCtrl', ['$scope', '$stateParams', 'Recipes',
        function($scope, $stateParams, Recipes) {
            $scope.recipe = Recipes.get({recipe: $stateParams.recipe}, function() {});

            $scope.showGroup = [];
            for (var i=0; i<10; i++) {
                $scope.showGroup[i] = 0;
            }

            $scope.toggleGroup = function(groupId) {
                if ($scope.isGroupShown(groupId)) {
                    $scope.showGroup[groupId] = 0;
                } else {
                    $scope.showGroup[groupId] = 1;
                }
            };
            $scope.isGroupShown = function(groupId) {
                return $scope.showGroup[groupId] == 1;
            };



    }])

;
