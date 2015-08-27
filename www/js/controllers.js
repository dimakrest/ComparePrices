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

    .controller('RootCtrl', function($scope, $ionicPopover, $ionicLoading, $timeout, $ionicSideMenuDelegate, PopUpFactory, ComparePricesStorage, ComparePricesConstants, UpdateStores, $cordovaGoogleAnalytics) {
        $scope.c = {};

        $scope.c.currentCartName = "";
        $scope.c.isCurrentCartPredefined = 0;
        $scope.c.showSearchBar = 0;
        $scope.c.keyPressed = 0;
        $scope.c.hasUserCarts = 0;
        $scope.c.comparedProducts = [];
        $scope.c.showPriceDetailsForShop = [];
        $scope.c.currentlyShopsDownloaded = 0;
        $scope.c.currentlyShopsDownloadedPercentage = 0;
        $scope.c.globalProgressLoadingPointer = "";

        // init localization array
        $scope.c.localize = document.localize;
        document.selectLanguage('heb');

        $scope.c.lastAddress = localStorage.getItem('lastAddress') || "";

        $scope.c.variableForPercentage = 123;
        $scope.c.rangeForShops = parseInt(localStorage.getItem('RangeForShops')) || ComparePricesConstants.DEFAULT_SHOPS_RANGE;

        $scope.c.useUsersCurrentLocation = parseInt(localStorage.getItem('UseUsersCurrentLocation')) || 0;
        $scope.c.useUsersCurrentLocation = $scope.c.useUsersCurrentLocation == 1;

        function generateGuid() {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();
        }

        // to distinguish real devices from development environment , we set a variable in local storage
        document.addEventListener("deviceready", function () {
            localStorage.setItem('IsRunningOnDevice', 1);
        }, false);

        document.addEventListener("deviceready", function () {
            $cordovaGoogleAnalytics.startTrackerWithId('UA-61254051-2');
            var UUID = localStorage.getItem('UUID') || "";
            if (UUID == "")
            {
                UUID = generateGuid();
                console.log("UUID: " + UUID)
                localStorage.setItem('UUID', UUID);
            }
            $cordovaGoogleAnalytics.setUserId(UUID);
        }, false);

        document.addEventListener("resume", function () {
            // app comes from background after user clicked settings button
            var userClickedSettingsLocation = localStorage.getItem('UserClickedSettingsLocation') || "0";
            userClickedSettingsLocation = (userClickedSettingsLocation == "1");
            if (userClickedSettingsLocation) {
                $scope.c.useUsersCurrentLocation = true;
                $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                UpdateStores.UpdateStoresInfoIfRequired($scope).then(function() {
                    localStorage.setItem('UserClickedSettingsLocation', 0);
                    localStorage.setItem('UseUsersCurrentLocation', $scope.c.useUsersCurrentLocation ? 1 : 0);
                    $scope.c.HideLoading();
                });
            }
        }, false);

        // Update the local storage only when user finishes to enter the value
        // choose range bar
        var rangeForShopsChangedPromise;
        $scope.c.UpdateRangeForShops = function(){

            if(rangeForShopsChangedPromise){
                $timeout.cancel(rangeForShopsChangedPromise);
            }
            rangeForShopsChangedPromise = $timeout(function() {
                var previousRangeForShops = parseInt(localStorage.getItem('RangeForShops'));
                localStorage.setItem('RangeForShops', $scope.c.rangeForShops);

                var lat = localStorage.getItem('Lat') || "";
                var lon = localStorage.getItem('Lon') || "";
                // if address is not set don't recalculate the distance
                if (lat == "" || lon == "" || $scope.c.lastAddress == "") {
                    return;
                }

                if ((localStorage.getItem('IsRunningOnDevice') || "0") != "0") {
                    $cordovaGoogleAnalytics.trackEvent('Settings', 'Change range', $scope.c.lastAddress, $scope.c.rangeForShops);
                }

                // update stores info only when user sets range bigger than default
                if (parseInt($scope.c.rangeForShops) < previousRangeForShops) {
                    return;
                }
                // Need to recalculate and create missing stores info
                $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                ComparePricesStorage.UpdateStoresInfo($scope, lat, lon, $scope.c.rangeForShops).then(function() {
                    $scope.c.HideLoading();
                });

            },500);
        };

        $scope.c.ClearShowPriceDetailsForShop = function(){
            for (var i=0; i<$scope.c.rangeForShops; i++) {
                $scope.c.showPriceDetailsForShop[i] = 0;
            }
        };

        // toggle button allow my current location
        $scope.c.LocationToggleChanged = function() {
            if ($scope.c.useUsersCurrentLocation) {
                $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                UpdateStores.UpdateStoresInfoIfRequired($scope).then(function () {
                    localStorage.setItem('UseUsersCurrentLocation', $scope.c.useUsersCurrentLocation ? 1 : 0);
                    $scope.c.HideLoading();
                });
            }
        };

        // TODO: need to restructure this, need to print the list in a pretty way
        $scope.c.ShareCartAndShopDetails = function() {
            var subject = 'Products List and shops info';
            var message = '';

            $scope.shopsNearThatHaveNeededProducts.forEach(function(singleShop) {
                if (singleShop['IsChecked']) {
                    message += 'Info about shop: \n';
                    message += 'Store Name: ' + singleShop["StoreName"] + '\n';
                    message += 'Price in Store: ' + singleShop["Price"] + '\n';
                    message += 'Store Address: ' + singleShop["Address"] + '\n';
                    message += 'Distance to Store: ' + singleShop["Distance"] + '\n';
                }
            });
            window.plugins.socialsharing.share(message, subject);
        };

        // Loading functions
        $scope.c.ShowLoading = function(templateText) {
            // Show loading
            $ionicLoading.show({
                template: templateText
            });

        };

        $scope.c.HideLoading = function() {
            $ionicLoading.hide();
        };

        // 2 function for toggling accordion in best_shops.html
        $scope.toggleDetails = function(shopId) {
            if ($scope.isDetailsShown(shopId)) {
                $scope.c.showPriceDetailsForShop[shopId] = 0;
            } else {
                $scope.c.showPriceDetailsForShop[shopId] = 1;
            }
        };
        $scope.isDetailsShown = function(shopId) {
            return $scope.c.showPriceDetailsForShop[shopId] == 1;
        };

        // wa for ionic and google autocomplete service
        $scope.DisableTap = function(){
            var container = document.getElementsByClassName('pac-container');
            // disable ionic data tab
            angular.element(container).attr('data-tap-disabled', 'true');
            // leave input field if google-address-entry is selected
            angular.element(container).on("click", function(){
                document.getElementById('searchBar').blur();
            });
        };

        $scope.c.HandleAddressIsNotSet = function() {
            var text  = $scope.c.localize.strings['ChooseYourAddressInSettings'];
            PopUpFactory.ErrorPopUp($scope, text, function() {
                $ionicSideMenuDelegate.toggleRight();
            });
        };
    })

    .controller('MyCartsCtrl', function($scope, $resource, $ionicPopup, PopUpFactory, ComparePricesStorage, ComparePricesConstants, FindBestShops, ShowModal, ionicMaterialInk, ionicMaterialMotion, UpdateStores) {

        $scope.totalCartsSelected = 0;
        $scope.newCartName = "";
        $scope.shopsNearThatHaveNeededProducts = [];
        $scope.missingProducts = [];

        ComparePricesStorage.GetAllCarts(function(result) {
            $scope.$apply(function() {
                $scope.c.myCartsInfo = result.rows;
                // check if user has own carts
                var numOfCarts = $scope.c.myCartsInfo.length;
                for (var i=0; i < numOfCarts; i++) {
                    if ($scope.c.myCartsInfo[i]['IsPredefined'] == 0) {
                        $scope.c.hasUserCarts = 1;
                        break;
                    }
                }
            })
        });

        $scope.lastCartID = localStorage.getItem('lastCartID') || "100";
        $scope.lastCartID = parseInt($scope.lastCartID);

        $scope.OpenCartDetails = function(cartID) {
            setTimeout(function()
            {
                $scope.c.myCartsInfo.forEach(function(singleCart) {
                    if (singleCart['CartID'] == cartID)
                    {
                        $scope.c.currentCartName = singleCart['CartName'];
                        $scope.c.isCurrentCartPredefined = singleCart['IsPredefined'];
                    }
                });

                location.href="#/tab/myCarts/cartDetails/" + cartID
            },100)
        };

        $scope.ChangeCheckbox = function() {
            var checkedValues = 0;

            $scope.c.myCartsInfo.forEach(function(singleCart) {
                if (singleCart['IsChecked']) {
                    checkedValues++;
                }
            });
            $scope.totalCartsSelected = checkedValues;
        };

        $scope.FindBestShopPrivate = function(cartIDs) {
            $scope.missingProducts = [];
            $scope.c.ShowLoading($scope.c.localize.strings['LookingForBestShop']);
            // closes opened accordions in best_shops.html
            $scope.c.ClearShowPriceDetailsForShop();
            ComparePricesStorage.GetMyCarts(cartIDs, function (myCart) {

                $scope.c.comparedProducts = [];
                myCart.rows.forEach(function(singleProduct)
                {
                    if (typeof($scope.c.comparedProducts[singleProduct.ItemCode]) == 'undefined')
                    {
                        $scope.c.comparedProducts[singleProduct.ItemCode] = [];
                        $scope.c.comparedProducts[singleProduct.ItemCode]['Amount'] = singleProduct.Amount;
                    }
                    else
                    {
                        $scope.c.comparedProducts[singleProduct.ItemCode]['Amount'] += singleProduct.Amount;
                    }

                });

                FindBestShops($scope, myCart.rows, $scope.c.rangeForShops).then(function (productsInfo) {

                    for (var i=0; i < productsInfo.rows.length; i++) {
                        $scope.c.comparedProducts[productsInfo.rows[i].ItemCode]['Image'] = productsInfo.rows[i].ImagePath;
                        $scope.c.comparedProducts[productsInfo.rows[i].ItemCode]['Name'] = productsInfo.rows[i].ItemName;
                    }

                    $scope.c.HideLoading();
                    ShowModal($scope, 'templates/best_shops.html');
                })
            });
        };

        $scope.FindBestShop = function() {
            if ($scope.c.lastAddress == '')
            {
                $scope.c.HandleAddressIsNotSet();
            }
            else
            {
                var cartIDs = [];
                $scope.shopsNearThatHaveNeededProducts = [];
                $scope.c.myCartsInfo.forEach(function(singleCart) {
                    if (singleCart['IsChecked']) {
                        cartIDs.push(singleCart['CartID']);
                    }
                });

                if (cartIDs.length == 0)
                {
                    var text  = $scope.c.localize.strings['ChooseCartsFirst'];
                    PopUpFactory.ErrorPopUp($scope, text);
                }
                else
                {
                    // if user wants to use his current location, need to check if his location changed
                    if ($scope.c.useUsersCurrentLocation) {
                        $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                        UpdateStores.UpdateStoresInfoIfRequired($scope).then(function() {
                            $scope.FindBestShopPrivate(cartIDs);
                        });
                    } else {
                        $scope.FindBestShopPrivate(cartIDs);
                    }
                }
            }
        };

        // TODO: return my popup and handle the response in calling function. same way as in confirm delete product
        // TODO: make pop-ups as service?
        $scope.CreateNewCart = function() {
            // An elaborate, custom popup
            $scope.popupData = {};
            $scope.popupData.newCartName = "";
            var placeHolder = ($scope.lastCartID == 100) ? $scope.c.localize.strings['Cart'] : $scope.c.localize.strings['Cart'] + ' ' + ($scope.lastCartID - 99);
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
                                   'CartName': res,
                                   'ImageUrl': ComparePricesConstants.DEFAULT_IMAGE_URL,
                                   'CheckboxColor': ComparePricesConstants.DEFAULT_CHECKBOX_COLOR,
                                   'IsPredefined': 0};

                $scope.c.myCartsInfo.push(newCartInfo);
                ComparePricesStorage.UpdateCartsList(newCartInfo);

                $scope.lastCartID = $scope.lastCartID + 1;
                $scope.c.hasUserCarts = 1;

                localStorage.setItem('lastCartID', $scope.lastCartID);

                setTimeout(function() {
                    ionicMaterialMotion.blinds();
                }, 0);
            });
        };

        // TODO: need to find an event when the list is ready
        // ionicMaterialMotion - to have the carts animation
        // ionicMaterialInk - material effect on buttons inside the ion-item
        setTimeout(function(){
//            ionicMaterialMotion.fadeSlideInRight();
//            ionicMaterialMotion.fadeSlideIn();

            //ionicMaterialInk.displayEffect();
            ionicMaterialMotion.blinds();

//            ionicMaterialMotion.ripple();
        }, 1500);

    })

    .controller('CartDetailsCtrl', function($scope, $stateParams, $ionicHistory, ComparePricesStorage, FindBestShops, UpdateStores, PopUpFactory, ComparePricesConstants, ShowModal, ImageCache, ionicMaterialMotion, ionicMaterialInk, $ionicFilterBar) {
        // ionic related variables. Used to create advanced  <ion-list>
        $scope.shouldShowDelete = false;
        $scope.shouldShowReorder = false;
        $scope.listCanSwipe = true;

        // TODO: try to implement the bar without all structures
        $scope.data = {};
        $scope.data.allProducts         = [];
        $scope.data.allProductsFiltered = [];
        $scope.data.showSearchResults   = false;

        $scope.myCart      = [];
        $scope.cartID = $stateParams.cartID;

        $scope.shopsNearThatHaveNeededProducts = [];
        $scope.missingProducts = [];

        ComparePricesStorage.GetMyCarts([$scope.cartID], function(result) {
            $scope.$apply(function() {
                $scope.myCart = result.rows;
            });
        });

        $scope.FindBestShopPrivate = function() {
            $scope.shopsNearThatHaveNeededProducts = [];
            $scope.missingProducts = [];
            $scope.c.ShowLoading($scope.c.localize.strings['LookingForBestShop']);
            // closes opened accordions in best_shops.html
            $scope.c.ClearShowPriceDetailsForShop();

            $scope.c.comparedProducts = [];
            $scope.myCart.forEach(function(singleProduct) {
                $scope.c.comparedProducts[singleProduct.ItemCode] = [];
                $scope.c.comparedProducts[singleProduct.ItemCode]['Amount'] = singleProduct.Amount;
            });

            FindBestShops($scope, $scope.myCart, $scope.c.rangeForShops).then(function(productsInfo) {

                for (var i=0; i < productsInfo.rows.length; i++) {
                    $scope.c.comparedProducts[productsInfo.rows[i].ItemCode]['Image'] = productsInfo.rows[i].ImagePath;
                    $scope.c.comparedProducts[productsInfo.rows[i].ItemCode]['Name'] = productsInfo.rows[i].ItemName;
                }
                $scope.c.HideLoading();
                ShowModal($scope, 'templates/best_shops.html');
            });
        };

        $scope.FindBestShop = function() {
            if ($scope.c.lastAddress == '')
            {
                $scope.c.HandleAddressIsNotSet();
            }
            else
            {
                if ($scope.c.useUsersCurrentLocation) {
                    $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                    UpdateStores.UpdateStoresInfoIfRequired($scope).then(function() {
                        $scope.FindBestShopPrivate();
                    })
                } else {
                    $scope.FindBestShopPrivate();
                }
            }
        };

        $scope.DeleteCart = function() {
            var title = $scope.c.localize.strings['AreYouSureWantToDeleteCartTitle'];
            var text  = $scope.c.localize.strings['AreYouSureWantToDeleteCartText'];
            PopUpFactory.ConfirmationPopUp($scope, title, text).then(function(confirmed) {
                if(confirmed) {
                    var numOfCarts = $scope.c.myCartsInfo.length;
                    var cartIndex  = -1;
                    var numOfUserCarts = 0;
                    for (var i=0; i < numOfCarts; i++) {
                        if ($scope.c.myCartsInfo[i]['IsPredefined'] == 0) {
                            numOfUserCarts++;
                        }
                        if ($scope.c.myCartsInfo[i]['CartID'] == $scope.cartID) {
                            cartIndex = i;
                        }
                    }
                    if (numOfUserCarts == 1) {  // user had last cart
                        $scope.c.hasUserCarts = 0;
                    }
                    if (cartIndex != -1) {
                        $scope.c.myCartsInfo.splice(cartIndex, 1);
                    }

                    ComparePricesStorage.DeleteCart($scope.cartID);
                    $ionicHistory.goBack();
                }
            });
        };

        $scope.DeleteProduct = function(product) {
            //// Need to remove the animate attribute, otherwise when I delete product the animation is very slow
            //// it takes a second to update the view
            //var ionList = document.getElementsByTagName('ion-list');
            //for (var k = 0; k < ionList.length; k++) {
            //    var toRemove = ionList[k].className;
            //    if (/animate-/.test(toRemove)) {
            //        ionList[k].className = ionList[k].className.replace(/(?:^|\s)animate-\S*(?:$|\s)/, '');
            //    }
            //}

            var numOfProductsInCart = $scope.myCart.length;
            var productIndex        = -1;
            for (var i=0; i < numOfProductsInCart; i++) {
                if ($scope.myCart[i]['ItemCode'] == product['ItemCode']) {
                    productIndex = i;
                    break;
                }
            }
            if (productIndex != -1) {
                $scope.myCart.splice(productIndex, 1);
            }
            ComparePricesStorage.UpdateCart($scope.cartID, $scope.myCart);

            if ($scope.myCart.length == 0)
            {
                $scope.shouldShowDelete = false;
            }

            //// put the animation class back
            //setTimeout(function(){
            //    document.getElementsByTagName('ion-list')[0].className += ' animate-blinds';
            //}, 500);
        };

        $scope.ToggleDeleteValue = function() {
            $scope.shouldShowDelete = !$scope.shouldShowDelete;
        };

        // this function called also from cartDetails list, and also in search
        $scope.UpdateProductAmount = function(itemInfo, amountToAdd, showConfirmationPopUp) {

            $scope.UpdateProductAmountInMyCart(itemInfo, amountToAdd, showConfirmationPopUp);

            // when this is called from cartDetails list, and not search, length will be zero, so below code is not relevant
            // TODO: is there a better way?
            var numOfFilteredProducts = $scope.data.allProductsFiltered.length;
            for (var i=0; i < numOfFilteredProducts; i++) {
                if ($scope.data.allProductsFiltered[i]['ItemCode'] == itemInfo['ItemCode']) {
                    $scope.data.allProductsFiltered[i]['Amount'] += parseInt(amountToAdd);
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
            // new product added, need to cache image, we cache only images for products in cart
            if (productIndex == -1) {
                var newItemInCart = {'CartID': $scope.cartID,
                    'ItemCode': itemInfo['ItemCode'],
                    'ItemName': itemInfo['ItemName'],
                    'ImagePath': itemInfo['ImagePath'],
                    'Amount': parseInt(amountToAdd)};
                $scope.myCart.push(newItemInCart);
                ImageCache.CacheImage(itemInfo['ItemCode'], itemInfo['ImagePath']);
                ComparePricesStorage.UpdateCart($scope.cartID, $scope.myCart);
            } else {
                // if amount is 0, delete the product
                var newAmount = $scope.myCart[productIndex]['Amount'] + parseInt(amountToAdd);
                if (newAmount == 0) {
                    if (showConfirmationPopUp) {
                        var title = $scope.c.localize.strings['AreYouSureWantToDeleteProductTitle'];
                        var text  = $scope.c.localize.strings['AreYouSureWantToDeleteProductText'];
                        PopUpFactory.ConfirmationPopUp($scope, title, text).then(function(confirmed) {
                            if(confirmed) {
                                $scope.myCart.splice(productIndex, 1);
                                ComparePricesStorage.UpdateCart($scope.cartID, $scope.myCart);
                            }
                        });
                    }
                    else
                    {
                        $scope.myCart.splice(productIndex, 1);
                        ComparePricesStorage.UpdateCart($scope.cartID, $scope.myCart);
                        // we come here in case we remove items from search. It can be done when ion-minus-circled delete buttons
                        // Need to turn off ion-minus-circled delete buttons in case we don't have more products
                        if ($scope.myCart.length == 0)
                        {
                            $scope.shouldShowDelete = false;
                        }
                    }
                } else {
                    $scope.myCart[productIndex]['Amount'] = newAmount;
                    ComparePricesStorage.UpdateCart($scope.cartID, $scope.myCart);
                }
            }
        };

        // TODO: don't want to initalize this every time, need to do this only when we want to update
        // the cart
        ComparePricesStorage.GetAllProducts(function(result) {
            $scope.data.allProducts = result.rows;
        });

        // based on https://github.com/djett41/ionic-filter-bar
        $scope.ShowFilterBar = function () {
            $ionicFilterBar.show({
                // items gets the array to filter
                items: $scope.data.allProducts,
                // this function is called when filtering is done
                // we take filtered items and place items that already in cart in the top of the list
                update: function (filteredItems) {
                    $scope.c.showSearchBar = 1;
                    $scope.data.showSearchResults   = true;
                    $scope.data.allProductsFiltered = [];

                    var numOfProductsInCart     = $scope.myCart.length;
                    var numOfFilteredProducts   = filteredItems.length;

                    for (var i=0; i < numOfProductsInCart; i++) {
                        for (var j=0; j < numOfFilteredProducts; j++) {
                            if ($scope.myCart[i]['ItemCode'] == filteredItems[j]['ItemCode']) {
                                $scope.data.allProductsFiltered.push(angular.copy($scope.myCart[i]));
                                break;
                            }
                        }
                    }
                    // Now add products that doesn't exist in the cart
                    for (var i=0; i < numOfFilteredProducts; i++) {
                        var singleProduct   = filteredItems[i];
                        var productFound    = false;

                        for (var j=0; j < numOfProductsInCart; j++) {
                            if ($scope.myCart[j]['ItemCode'] == singleProduct['ItemCode']) {
                                productFound = true;
                                break;
                            }
                        }
                        if (!productFound) {
                            singleProduct['Amount'] = 0;
                            $scope.data.allProductsFiltered.push(singleProduct);
                        }
                    }
                },
                // Called after the filterBar is removed. This can happen when the cancel button is pressed, the backdrop is tapped
                // or swiped, or the back button is pressed.
                cancel: function() {
                    $scope.data.allProductsFiltered = [];
                    $scope.data.showSearchResults = false;
                    $scope.c.showSearchBar = 0;
                    $scope.c.keyPressed = 0;
                },
                debounce: true,
                cancelText: $scope.c.localize.strings['CancelSearch'],
                delay: 500,
                keyPressed: function () {
                    // this function is needed to hide what is after backdrop, as backdrop dissappears immediately, and results come only after 500ms
                    $scope.$apply(function() {
                        $scope.c.keyPressed = 1;
                    });
                },
                filterProperties: 'ItemName'
            });
        };

        // TODO: need to find an event when the list is ready
        setTimeout(function(){
//            ionicMaterialMotion.fadeSlideInRight();
//            ionicMaterialMotion.fadeSlideIn();
//            ionicMaterialInk.displayEffect();
            ionicMaterialMotion.blinds();

//            ionicMaterialMotion.ripple();
        }, 1500);
});
