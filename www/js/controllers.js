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

    .controller('RootCtrl', function($scope, ComparePricesStorage, PopUpWithDuration) {
        $scope.c = {}

        $scope.c.myCart      = []
        $scope.c.allProducts = []
        $scope.c.allProductsByItemID = []
        $scope.c.cartID = -1

        // init localization array
        $scope.c.localize = document.localize
        document.selectLanguage('heb')

        //////////// Edit cart related variables and methods ////////////
        ComparePricesStorage.GetAllProducts(function(result) {
            $scope.c.allProducts = result.rows
            // TODO: may be to replace allProducts with allProductsByItemID in the whole code?
            $scope.c.allProducts.forEach(function(singleProduct) {
                $scope.c.allProductsByItemID[singleProduct['ItemCode']] = singleProduct;
            });
        })

        $scope.c.searchQueryEditProduct =""
        $scope.c.clearSearch = function()
        {
            $scope.c.searchQueryEditProduct = ""
        }

        // TODO: maybe there's a prettier way, no need to change the entire cart
        $scope.c.ItemWasClicked = function(clickedItem) {
            var numOfProductsInCart = $scope.c.myCart.length
            var productIndex        = -1
            for (var i=0; i < numOfProductsInCart; i++) {
                if ($scope.c.myCart[i]['ItemCode'] == clickedItem['ItemCode']) {
                    productIndex = i
                    break;
                }
            }
            if (productIndex == -1) {
                var newItemInCart = {'CartID': $scope.c.cartID,
                    'ItemCode': clickedItem['ItemCode'],
                    'ItemName': clickedItem['ItemName'],
                    'Amount': 1}
                $scope.c.myCart.push(newItemInCart)
            } else {
                $scope.c.myCart[i]['Amount']++
            }

            ComparePricesStorage.UpdateCart($scope.c.cartID, $scope.c.myCart)

            PopUpWithDuration(400, $scope.c.localize.strings['AddedProduct'])
        }

        ////////////////////////////////////////////////////////////////////////
    })

    .controller('SuggestedCtrl', function() {
        console.log("Here")
    })

    .controller('MyCartsCtrl', function($scope, ComparePricesStorage) {
        // ionic related variables. Used to create advanced  <ion-list>
        $scope.shouldShowDelete = false;
        $scope.shouldShowReorder = false;
        $scope.listCanSwipe = true

        ComparePricesStorage.GetAllCarts(function(result) {
            $scope.$apply(function() {
                $scope.myCartIDs = result.rows
            })
        })

        $scope.lastCartID = localStorage.getItem('lastCartID') || "1"

        $scope.CreateNewCart = function() {
            var cartName = "Cart_" + $scope.lastCartID
            $scope.myCartIDs[$scope.lastCartID] = cartName
            ComparePricesStorage.UpdateCartsList({'CartID': $scope.lastCartID,
                                                  'CartName':cartName})

            $scope.lastCartID = String(parseInt($scope.lastCartID) + 1)

            localStorage.setItem('lastCartID', $scope.lastCartID)
        }

        $scope.DeleteCart = function(cartID) {
            delete $scope.myCartIDs[cartID]

            ComparePricesStorage.DeleteCart(cartID)
        }

        $scope.ToggleDeleteValue = function() {
            $scope.shouldShowDelete = !$scope.shouldShowDelete;
        }

        $scope.OpenCartDetails = function(cartID) {
            setTimeout(function()
            {
                location.href="#/tab/myCarts/cartDetails/" + cartID
            },100)
        }
    })

    .controller('CartDetailsCtrl', function($scope, $stateParams, $ionicModal, ComparePricesStorage) {

        console.log("In cart details ctrl")
        // ionic related variables. Used to create advanced  <ion-list>
        $scope.shouldShowDelete = false;
        $scope.shouldShowReorder = false;
        $scope.listCanSwipe = true

        $scope.c.cartID = $stateParams.cartID

        $scope.searchQuery = ""

        $scope.clearSearch = function()
        {
            $scope.searchQuery = ""
        }

        ComparePricesStorage.GetMyCart($scope.c.cartID, function(result) {
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
            ComparePricesStorage.UpdateCart($scope.c.cartID, $scope.c.myCart)
        }

        $scope.ToggleDeleteValue = function() {
            $scope.shouldShowDelete = !$scope.shouldShowDelete;
        }

        $scope.OpenProductsList = function()
        {
            $ionicModal.fromTemplateUrl('templates/edit_cart.html', {
                scope: $scope,
                animation: 'slide-in-up',
                backdropClickToClose: true,
                hardwareBackButtonClose:true
            }).then(function(modal)
            {
                $scope.c.editProduct = modal
                $scope.c.editProduct.show()


                $scope.c.editProduct.close= function()
                {
                    $scope.c.editProduct.remove()
                }
            })
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
