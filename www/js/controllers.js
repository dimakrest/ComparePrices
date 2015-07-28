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

    .controller('RootCtrl', function($scope, ComparePricesStorage) {
        $scope.c = {};

        $scope.c.allProducts = [];
        $scope.c.allProductsByItemID = [];

        // TODO: Not the best code, to keep the cart name in this way
        $scope.c.currentCartName = "";

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
        });
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

        $scope.OpenCartDetails = function(cartID, cartName) {
            setTimeout(function()
            {
                $scope.c.currentCartName = cartName;
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

        // TODO: return my popup and handle the response in calling function. same way as in confirm delete product
        $scope.AskForCartName = function() {
            // An elaborate, custom popup
            $scope.popupData = {};
            $scope.popupData.newCartName = "";
            var placeHolder = $scope.c.localize.strings['Cart'] + ' ' + $scope.lastCartID;
            var myPopup = $ionicPopup.show({
                template: '<input style="text-align:right" type="text" ng-model="popupData.newCartName", placeholder="' + placeHolder + '">',
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

    .controller('CartDetailsCtrl', function($scope, $stateParams, $ionicModal, $ionicPopup, ComparePricesStorage, MiscFunctions, PopUpWithDuration, ComparePricesConstants) {
        // ionic related variables. Used to create advanced  <ion-list>
        $scope.shouldShowDelete = false;
        $scope.shouldShowReorder = false;
        $scope.listCanSwipe = true;

        $scope.myCart      = [];
        $scope.cartID = $stateParams.cartID;

        // WA for ionic bug
        $scope.struct = {};
        $scope.struct.searchQueryCartDetails = "";
        $scope.struct.searchQueryEditProduct = "";

        $scope.allProductsFiltered = [];
        $scope.numOfProductsToShow = ComparePricesConstants.NUM_OF_PRODUCTS_TO_SHOW_INIT;

        $scope.ClearSearchCartDetails = function()
        {
            $scope.struct.searchQueryCartDetails = "";
        };

        ComparePricesStorage.GetMyCart($scope.cartID, function(result) {
            $scope.$apply(function() {
                $scope.myCart = result.rows;
            });
        });

        $scope.FindBestShop = function() {
            // At first get from myCart only ItemCodes
            var productCodesInMyCart = [];
            $scope.myCart.forEach(function(singleItem) {
                productCodesInMyCart.push(singleItem['ItemCode'])
            });

            ComparePricesStorage.GetProductsForEachShopByItemCode(productCodesInMyCart, function(result) {
                MiscFunctions.CalculateBestShopValues($scope.myCart, result)
            });
        };

        $scope.DeleteProduct = function(product) {
            var numOfProductsInCart = $scope.myCart.length;
            var productIndex        = -1;
            for (var i=0; i < numOfProductsInCart; i++) {
                if ($scope.myCart[i]['ItemCode'] == product['ItemCode']) {
                    productIndex = i;
                    break;
                }
            }
            if (productIndex != -1) {
                $scope.myCart.splice(productIndex, 1)
            }
            ComparePricesStorage.UpdateCart($scope.cartID, $scope.myCart)
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
                $scope.editProduct = modal;
                $scope.editProduct.show();

                $scope.editProduct.close = function()
                {
                    $scope.editProduct.remove()
                }
            })
        };

        $scope.ClearSearchEditProduct = function()
        {
            $scope.struct.searchQueryEditProduct = "";
            $scope.allProductsFiltered = [];
            $scope.numOfProductsToShow = ComparePricesConstants.NUM_OF_PRODUCTS_TO_SHOW_INIT;
        };

        $scope.$watch('struct.searchQueryEditProduct', function() {
            $scope.allProductsFiltered = [];
            $scope.numOfProductsToShow = ComparePricesConstants.NUM_OF_PRODUCTS_TO_SHOW_INIT;

            var numOfAllProducts                = $scope.c.allProducts.length;
            var numOfProductsInFilteredArray    = 0;
            for (var i=0; i < numOfAllProducts; i++) {
                // in two's compliment systems, -1 is represented in binary as all 1s (1111 1111 1111 1111 1111 1111 1111 1111 for 32 bit).
                // The bitwise inverse (~) of this is all zeros, or just zero, and therefore falsy. That's why the squiggle trick works
                if (~$scope.c.allProducts[i]['ItemName'].indexOf($scope.struct.searchQueryEditProduct)) {
                    var product = $scope.c.allProducts[i];
                    product['Amount'] = 0;

                    var numOfProductsInMyCart = $scope.myCart.length;
                    for (var j=0; j < numOfProductsInMyCart; j++) {
                        if ($scope.myCart[j]['ItemCode'] == product['ItemCode']) {
                            product['Amount'] = $scope.myCart[j]['Amount'];
                            break;
                        }
                    }

                    $scope.allProductsFiltered.push(product);

                    numOfProductsInFilteredArray++;
                    if (numOfProductsInFilteredArray == $scope.numOfProductsToShow) {
                        break;
                    }
                }
            }
        });

        $scope.LoadMoreProducts = function() {
            var numOfProducts                   = $scope.c.allProducts.length;
            var numOfProductsInFilteredArray    = 0;
            $scope.numOfProductsToShow += ComparePricesConstants.NUM_OF_PRODUCTS_TO_LOAD_MORE;
            $scope.allProductsFiltered = [];

            for (var i=0; i < numOfProducts; i++) {
                // in two's compliment systems, -1 is represented in binary as all 1s (1111 1111 1111 1111 1111 1111 1111 1111 for 32 bit).
                // The bitwise inverse (~) of this is all zeros, or just zero, and therefore falsy. That's why the squiggle trick works
                if (~$scope.c.allProducts[i]['ItemName'].indexOf($scope.struct.searchQueryEditProduct)) {
                    var product = $scope.c.allProducts[i];
                    product['Amount'] = 0;

                    var numOfProductsInMyCart = $scope.myCart.length;
                    for (var j=0; j < numOfProductsInMyCart; j++) {
                        if ($scope.myCart[j]['ItemCode'] == product['ItemCode']) {
                            product['Amount'] = $scope.myCart[j]['Amount'];
                            break;
                        }
                    }

                    $scope.allProductsFiltered.push(product);

                    numOfProductsInFilteredArray++;
                    if (numOfProductsInFilteredArray == $scope.numOfProductsToShow) {
                        break;
                    }
                }
            }
            $scope.$broadcast('scroll.infiniteScrollComplete');
        };

        $scope.UpdateProductAmountFromCartDetails = function(itemInfo, amountToAdd) {
            $scope.UpdateProductAmountInMyCart(itemInfo, amountToAdd, true);
        };

        $scope.UpdateProductAmountFromEditCart = function(itemInfo, amountToAdd) {
            $scope.UpdateProductAmountInMyCart(itemInfo, amountToAdd, false);

            // TODO: is there a better way?
            var numOfFilteredProducts = $scope.allProductsFiltered.length;
            for (var i=0; i < numOfFilteredProducts; i++) {
                if ($scope.allProductsFiltered[i]['ItemCode'] == itemInfo['ItemCode']) {
                    $scope.allProductsFiltered[i]['Amount'] += parseInt(amountToAdd);
                    break;
                }
            }
        };

        $scope.UpdateProductAmountInMyCart = function(itemInfo, amountToAdd, showConfirmationPopUp) {
            var numOfProductsInCart = $scope.myCart.length;
            var productIndex        = -1;
            for (var i=0; i < numOfProductsInCart; i++) {
                if ($scope.myCart[i]['ItemCode'] == itemInfo['ItemCode']) {
                    productIndex = i;
                    break;
                }
            }
            if (productIndex == -1) {
                var newItemInCart = {'CartID': $scope.cartID,
                    'ItemCode': itemInfo['ItemCode'],
                    'ItemName': itemInfo['ItemName'],
                    'ImagePath': itemInfo['ImagePath'],
                    'Amount': parseInt(amountToAdd)};
                $scope.myCart.push(newItemInCart)
                ComparePricesStorage.UpdateCart($scope.cartID, $scope.myCart);
            } else {
                // if amount is 0, delete the product
                var newAmount = $scope.myCart[productIndex]['Amount'] + parseInt(amountToAdd);
                if (newAmount == 0) {
                    if (showConfirmationPopUp) {
                        $scope.ConfirmProductDelete().then(function(confirmed) {
                            if(confirmed) {
                                $scope.myCart.splice(productIndex, 1)
                                ComparePricesStorage.UpdateCart($scope.cartID, $scope.myCart);
                            }
                        });
                    }
                } else {
                    $scope.myCart[productIndex]['Amount'] = newAmount;
                }
            }
        };

        $scope.ConfirmProductDelete = function() {
            return $ionicPopup.confirm({
                title: $scope.c.localize.strings['AreYouSureWantToDeleteProductTitle'],
                template: '<div style="text-align:right">' + $scope.c.localize.strings['AreYouSureWantToDeleteProductText'] + '</div>',
                buttons: [
                    { text: $scope.c.localize.strings['NoButton'],
                        onTap: function(e) {
                            return false;
                        }
                    },
                    { text: '<b>' + $scope.c.localize.strings['YesButton'] + '</b>',
                        type: 'button-positive',
                        onTap: function(e) {
                            return true
                        }
                    }
                ]
            });
        };

        // TODO: maybe there's a prettier way, no need to change the entire cart
        $scope.ItemWasClickedInEditCart = function(clickedItem) {
            $scope.UpdateProductAmountFromEditCart(clickedItem, 1);
            PopUpWithDuration(400, $scope.c.localize.strings['AddedProduct'])
        };
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
