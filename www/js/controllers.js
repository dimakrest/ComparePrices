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

    .controller('RootCtrl', function($scope, ComparePricesStorage, PopUpWithDuration, ComparePricesConstants) {
        $scope.c = {};

        $scope.c.myCart      = [];
        $scope.c.allProducts = [];
        $scope.c.allProductsFiltered = [];
        $scope.c.allProductsByItemID = [];

        $scope.c.cartID = -1;
        $scope.c.numOfProductsToShow = ComparePricesConstants.NUM_OF_PRODUCTS_TO_SHOW_INIT;

        $scope.c.searchQuery = "";
        $scope.c.searchQueryEditProduct = "";

        // init localization array
        $scope.c.localize = document.localize;
        document.selectLanguage('heb');

        $scope.c.lastAddress = localStorage.getItem('lastAddress') || "";

        //////////// Edit cart related variables and methods ////////////
        ComparePricesStorage.GetAllProducts(function(result) {
            $scope.c.allProducts = result.rows;
            // TODO: may be to replace allProducts with allProductsByItemID in the whole code?
            $scope.c.allProducts.forEach(function(singleProduct) {
                $scope.c.allProductsByItemID[singleProduct['ItemCode']] = singleProduct;
            });

            // TODO: download the images
            var numOfProducts = $scope.c.allProducts.length;
            for (var i=0; i < numOfProducts; i++) {
                $scope.c.allProducts[i]['ItemImage'] = 'http://www.shufersal.co.il/_layouts/images/Shufersal/Images/Products_Large/z_' +
                                                        $scope.c.allProducts[i]['ItemCode'] + '.PNG';
            }
        })

        $scope.c.clearSearch = function()
        {
            $scope.c.searchQueryEditProduct = "";
            $scope.c.allProductsFiltered = [];
            $scope.c.numOfProductsToShow = ComparePricesConstants.NUM_OF_PRODUCTS_TO_SHOW_INIT;
        };

        $scope.$watch('c.searchQueryEditProduct', function() {
            $scope.c.allProductsFiltered = [];
            $scope.c.numOfProductsToShow = ComparePricesConstants.NUM_OF_PRODUCTS_TO_SHOW_INIT;
            var numOfAllProducts                = $scope.c.allProducts.length;
            var numOfProductsInFilteredArray    = 0;
            for (var i=0; i < numOfAllProducts; i++) {
                // in two's compliment systems, -1 is represented in binary as all 1s (1111 1111 1111 1111 1111 1111 1111 1111 for 32 bit).
                // The bitwise inverse (~) of this is all zeros, or just zero, and therefore falsy. That's why the squiggle trick works
                if (~$scope.c.allProducts[i]['ItemName'].indexOf($scope.c.searchQueryEditProduct)) {
                    $scope.c.allProductsFiltered.push($scope.c.allProducts[i]);

                    numOfProductsInFilteredArray++;
                    if (numOfProductsInFilteredArray == $scope.c.numOfProductsToShow) {
                        break;
                    }
                }
            }
        });

        $scope.c.LoadMoreProducts = function() {
            var numOfProducts                   = $scope.c.allProducts.length;
            var numOfProductsInFilteredArray    = 0;
            $scope.c.numOfProductsToShow += ComparePricesConstants.NUM_OF_PRODUCTS_TO_LOAD_MORE;
            $scope.c.allProductsFiltered = [];

            for (var i=0; i < numOfProducts; i++) {
                // in two's compliment systems, -1 is represented in binary as all 1s (1111 1111 1111 1111 1111 1111 1111 1111 for 32 bit).
                // The bitwise inverse (~) of this is all zeros, or just zero, and therefore falsy. That's why the squiggle trick works
                if (~$scope.c.allProducts[i]['ItemName'].indexOf($scope.c.searchQueryEditProduct)) {
                    numOfProductsInFilteredArray++;
                    $scope.c.allProductsFiltered.push($scope.c.allProducts[i]);

                    if (numOfProductsInFilteredArray == $scope.c.numOfProductsToShow)
                    {
                        break;
                    }
                }
            }
            $scope.$broadcast('scroll.infiniteScrollComplete');
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
                // TODO: download the images
                var newItemInCart = {'CartID': $scope.c.cartID,
                                     'ItemCode': clickedItem['ItemCode'],
                                     'ItemName': clickedItem['ItemName'],
                                     'ItemImage': 'http://www.shufersal.co.il/_layouts/images/Shufersal/Images/Products_Large/z_' + clickedItem['ItemCode'] + '.PNG',
                                     'Amount': 1};
                $scope.c.myCart.push(newItemInCart)
            } else {
                $scope.c.myCart[i]['Amount']++
            }

            ComparePricesStorage.UpdateCart($scope.c.cartID, $scope.c.myCart);

            PopUpWithDuration(400, $scope.c.localize.strings['AddedProduct'])
        };
        ////////////////////////////////////////////////////////////////////////

        //////////////// Location calculation + auto complete /////////////////
        // TODO: make directive
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
            ////////////////////////////////////////////////////////////////////////
    })

    .controller('SuggestedCtrl', function() {
        console.log("Here")
    })

    .controller('MyCartsCtrl', function($scope, $ionicPopup, ComparePricesStorage, MiscFunctions) {
        // ionic related variables. Used to create advanced  <ion-list>
        $scope.shouldShowDelete = false;
        $scope.shouldShowReorder = false;
        $scope.listCanSwipe = true;

        $scope.newCartName = "";

        ComparePricesStorage.GetAllCarts(function(result) {
            $scope.$apply(function() {
                $scope.myCartsInfo = result.rows
            })
        });

        $scope.lastCartID = localStorage.getItem('lastCartID') || "1";

        $scope.CreateNewCart = function() {
            $scope.AskForCartName();
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
        };

        $scope.AskForCartName = function() {
            // An elaborate, custom popup
            $scope.popupData = {};
            $scope.popupData.newCartName = "";
            var placeHolder = $scope.c.localize.strings['Cart'] + ' ' + $scope.lastCartID;
            console.log("Placeholder value = " + placeHolder);
            var myPopup = $ionicPopup.show({
                template: '<input type="text" ng-model="popupData.newCartName", placeholder=' + placeHolder + '>',
                title: $scope.c.localize.strings['EnterCartName'],
                scope: $scope,
                buttons: [
                    { text: $scope.c.localize.strings['CancelButton'],
                      onTap: function(e) {
                          return 'CancelButtonPressed';
                      }
                    },
                    { text: '<b>' + $scope.c.localize.strings['SaveButton'] + '</b>',
                      type: 'button-positive',
                      onTap: function(e) {
                        if ($scope.popupData.newCartName == "") {
                            //don't allow the user to close unless he enters wifi password
                            return placeHolder;
                        } else {
                            return $scope.popupData.newCartName;
                        }
                      }
                    }
                ]
            });
            myPopup.then(function(res) {
                if (res == 'CancelButtonPressed') {
                    return;
                }

                var newCartInfo = {'CartID'  : $scope.lastCartID,
                                   'CartName': res};
                $scope.myCartsInfo.push(newCartInfo);
                ComparePricesStorage.UpdateCartsList(newCartInfo);

                $scope.lastCartID = String(parseInt($scope.lastCartID) + 1);

                localStorage.setItem('lastCartID', $scope.lastCartID)
            });
        };
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

                // TODO: download the images
                var numOfProducts = $scope.c.myCart.length;
                for (var i=0; i < numOfProducts;i ++) {
                    $scope.c.myCart[i]['ItemImage'] = 'http://www.shufersal.co.il/_layouts/images/Shufersal/Images/Products_Large/z_' + $scope.c.myCart[i]['ItemCode']
                                                       + '.PNG'
                }
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

    .controller('RecipesListCtrl', function($scope, Recipes, CalculatePriceForRecipes) {
            $scope.recipesSelected = [];
            $scope.productsByRecipeId = [];
            $scope.totalRecipesSelected = 0;
            Recipes.query(function(result) {
                $scope.recipes = result;
                $scope.recipes.forEach(function(singleRecipe) {
                    $scope.recipesSelected[singleRecipe.id] = 0;
                    $scope.productsByRecipeId[singleRecipe.id] = singleRecipe["products"];
                });
            });

            $scope.IncreaseRecipes = function(recipeID) {
                if($scope.recipesSelected[recipeID] < 9)
                {
                    $scope.recipesSelected[recipeID]++;
                    $scope.totalRecipesSelected++;
                }
            };

            $scope.DecreaseRecipes = function(recipeID) {
                if($scope.recipesSelected[recipeID] > 0)
                {
                    $scope.recipesSelected[recipeID]--;
                    $scope.totalRecipesSelected--;
                }
            };

            $scope.FindBestShop = function() {
                var totalProducts = [];

                for (var recipeId in $scope.recipesSelected)
                {
                    if ($scope.recipesSelected[recipeId] > 0)
                    {

                        for (var productId in $scope.productsByRecipeId[recipeId])
                        {
                            if (productId in totalProducts)
                            {
                                // amount of product per receipt multiplied by num od receipts
                                totalProducts[productId] += $scope.productsByRecipeId[recipeId][productId] * $scope.recipesSelected[recipeId];
                            }
                            else
                            {
                                totalProducts[productId] = $scope.productsByRecipeId[recipeId][productId] * $scope.recipesSelected[recipeId];
                            }
                        }
                    }
                }
                CalculatePriceForRecipes.FindBestShop(totalProducts);
            }

    })

    .controller('RecipeCtrl', function($scope, $stateParams, Recipes, CalculatePriceForRecipes) {
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
                CalculatePriceForRecipes.FindBestShop($scope.recipe.products);
            };

    })

;
