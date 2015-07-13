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
        $scope.c = {};

        $scope.c.myCart      = [];
        $scope.c.allProducts = [];
        $scope.c.allProductsByItemID = [];
        $scope.c.cartID = -1;

        $scope.c.searchQuery = "";

        // init localization array
        $scope.c.localize = document.localize;
        document.selectLanguage('heb');

        $scope.c.lastAddress = localStorage.getItem('lastAddress') || "";

        //////////// Edit cart related variables and methods ////////////
        ComparePricesStorage.GetAllProducts(function(result) {
            $scope.c.allProducts = result.rows
            // TODO: may be to replace allProducts with allProductsByItemID in the whole code?
            $scope.c.allProducts.forEach(function(singleProduct) {
                $scope.c.allProductsByItemID[singleProduct['ItemCode']] = singleProduct;
            });
        })


        $scope.c.searchQueryEditProduct ="";
        $scope.c.clearSearch = function()
        {
            $scope.c.searchQueryEditProduct = ""
        };

        // TODO: maybe there's a prettier way, no need to change the entire cart
        $scope.c.ItemWasClicked = function(clickedItem) {
            var numOfProductsInCart = $scope.c.myCart.length;
            var productIndex        = -1;
            for (var i=0; i < numOfProductsInCart; i++) {
                if ($scope.c.myCart[i]['ItemCode'] == clickedItem['ItemCode']) {
                    productIndex = i;
                    break;
                }
            }
            if (productIndex == -1) {
                var newItemInCart = {'CartID': $scope.c.cartID,
                                     'ItemCode': clickedItem['ItemCode'],
                                     'ItemName': clickedItem['ItemName'],
                                     'Amount': 1};
                $scope.c.myCart.push(newItemInCart)
            } else {
                $scope.c.myCart[i]['Amount']++
            }

            ComparePricesStorage.UpdateCart($scope.c.cartID, $scope.c.myCart);

            PopUpWithDuration(400, $scope.c.localize.strings['AddedProduct'])
        };

        ////////////////////////////////////////////////////////////////////////

        // Location calculation + auto complete
        var input = /** @type {HTMLInputElement} */(
            document.getElementById('pac-input'));
        var autocomplete = new google.maps.places.Autocomplete(input);
        google.maps.event.addListener(autocomplete, 'place_changed', function() {
            var place = autocomplete.getPlace();

            console.log(place)
            if (!place.geometry) {
                // TODO: chamge error message
                window.alert("Autocomplete's returned place contains no geometry");
                return;
            }

            ComparePricesStorage.UpdateStoreRadiusFromLocations(place.geometry.location.A,
                                                                place.geometry.location.F);
            $scope.c.lastAddress = place.formatted_address;
            localStorage.setItem('lastAddress', $scope.c.lastAddress)
            });
    })

    .controller('SuggestedCtrl', function() {
        console.log("Here")
    })

    .controller('MyCartsCtrl', function($scope, ComparePricesStorage, MiscFunctions) {
        // ionic related variables. Used to create advanced  <ion-list>
        $scope.shouldShowDelete = false;
        $scope.shouldShowReorder = false;
        $scope.listCanSwipe = true;

        ComparePricesStorage.GetAllCarts(function(result) {
            $scope.$apply(function() {
                $scope.myCartsInfo = result.rows
            })
        });

        $scope.lastCartID = localStorage.getItem('lastCartID') || "1";

        $scope.CreateNewCart = function() {
            var newCartInfo = {'CartID'  : $scope.lastCartID,
                               'CartName': "Cart_" + $scope.lastCartID};

            $scope.myCartsInfo.push(newCartInfo);
            ComparePricesStorage.UpdateCartsList(newCartInfo);

            $scope.lastCartID = String(parseInt($scope.lastCartID) + 1);

            localStorage.setItem('lastCartID', $scope.lastCartID)
        };

        $scope.DeleteCart = function(cartID) {
            var numOfCarts = $scope.myCartsInfo.length;
            var cartIndex  = -1;
            for (var i=0; i < numOfCarts; i++) {
                if ($scope.myCartsInfo[i]['CartID'] == cartID) {
                    cartIndex = i;
                    break;
                }
            }
            if (cartIndex != -1) {
                $scope.myCartsInfo.splice(cartIndex, 1)
            }

            ComparePricesStorage.DeleteCart(cartID)
        };

        $scope.ToggleDeleteValue = function() {
            $scope.shouldShowDelete = !$scope.shouldShowDelete;
        };

        $scope.OpenCartDetails = function(cartID) {
            setTimeout(function()
            {
                location.href="#/tab/myCarts/cartDetails/" + cartID
            },100)
        };

        $scope.FindNearestShopMyCarts = function(cartID) {
            ComparePricesStorage.GetMyCart(cartID, function(myCart) {
                myCart = myCart.rows;
                // At first get from myCart only ItemCodes
                var productCodesInMyCart = [];
                myCart.forEach(function(singleItem) {
                    productCodesInMyCart.push(singleItem['ItemCode'])
                });
                ComparePricesStorage.GetProductsForEachShopByItemCode(productCodesInMyCart, function(result) {
                    MiscFunctions.CalculateBestShopValues(myCart, result)
                });
            })
        }
    })

    .controller('CartDetailsCtrl', function($scope, $stateParams, $ionicModal, ComparePricesStorage, MiscFunctions) {
        // ionic related variables. Used to create advanced  <ion-list>
        $scope.shouldShowDelete = false;
        $scope.shouldShowReorder = false;
        $scope.listCanSwipe = true;

        $scope.c.cartID = $stateParams.cartID;

        $scope.clearSearch = function()
        {
            $scope.c.searchQuery = ""
        };

        ComparePricesStorage.GetMyCart($scope.c.cartID, function(result) {
            $scope.$apply(function() {
                $scope.c.myCart = result.rows
            });
        });

        $scope.FindBestShop = function() {
            // At first get from myCart only ItemCodes
            var productCodesInMyCart = [];
            $scope.c.myCart.forEach(function(singleItem) {
                productCodesInMyCart.push(singleItem['ItemCode'])
            });

            ComparePricesStorage.GetProductsForEachShopByItemCode(productCodesInMyCart, function(result) {
                MiscFunctions.CalculateBestShopValues($scope.c.myCart, result)
            });
        };

        $scope.ClearMyCart = function() {
            $scope.c.myCart = [];
            ComparePricesStorage.ClearMyCart()
        };

        $scope.DeleteProduct = function(product) {
            var numOfProductsInCart = $scope.c.myCart.length;
            var productIndex        = -1;
            for (var i=0; i < numOfProductsInCart; i++) {
                if ($scope.c.myCart[i]['ItemCode'] == product['ItemCode']) {
                    productIndex = i;
                    break;
                }
            }
            if (productIndex != -1) {
                $scope.c.myCart.splice(productIndex, 1)
            }
            ComparePricesStorage.UpdateCart($scope.c.cartID, $scope.c.myCart)
        };

        $scope.ToggleDeleteValue = function() {
            $scope.shouldShowDelete = !$scope.shouldShowDelete;
        };

        $scope.OpenProductsList = function()
        {
            $ionicModal.fromTemplateUrl('templates/edit_cart.html', {
                scope: $scope,
                animation: 'slide-in-up',
                backdropClickToClose: true,
                hardwareBackButtonClose: true
            }).then(function(modal)
            {
                $scope.c.editProduct = modal;
                $scope.c.editProduct.show();

                $scope.c.editProduct.close = function()
                {
                    $scope.c.editProduct.remove()
                }
            })
        }

     })

    .controller('RecipesListCtrl', function($scope, Recipes) {
            $scope.recipes = Recipes.query();
    })

    .controller('RecipeCtrl', function($scope, $stateParams, Recipes, ComparePricesStorage, MiscFunctions) {
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

            $scope.FindBestShop = function() {
                // At first get from myCart only ItemCodes
                var productCodesInMyCart = [];
                var productsStructForCalculation = [];
                $scope.recipe.products.forEach(function(itemCode) {
                    productCodesInMyCart.push(itemCode);
                    productsStructForCalculation.push({"ItemCode":itemCode,"Amount":1});
                });


                ComparePricesStorage.GetProductsForEachShopByItemCode(productCodesInMyCart, function(result) {
                    MiscFunctions.CalculateBestShopValues(productsStructForCalculation, result)
                });
            };

    })

;
