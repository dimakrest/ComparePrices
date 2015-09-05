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

    .controller('RootCtrl', function($scope, $ionicLoading, $timeout, $ionicSideMenuDelegate, PopUpFactory, ComparePricesStorage, ComparePricesConstants, UpdateStores, $cordovaGoogleAnalytics,
                                     MiscFunctions) {
        $scope.c = {};

        $scope.c.currentCartName = "";
        $scope.c.currentProductGroupName = "";
        $scope.c.isCurrentCartPredefined    = 0;
        $scope.c.showSearchBar = 0;
        $scope.c.keyPressed = 0;
        $scope.c.comparedProducts = [];
        $scope.c.allProducts = [];
        $scope.c.showPriceDetailsForShop = [];
        $scope.c.currentlyShopsDownloaded = 0;
        $scope.c.currentlyShopsDownloadedPercentage = 0;
        $scope.c.globalProgressLoadingPointer = "";
        $scope.c.maxShopsToShow = ComparePricesConstants.DEFAULT_MAX_SHOPS_TO_SHOW;
        $scope.c.maxShopsOfTheSameBrand = ComparePricesConstants.DEFAULT_MAX_SHOPS_OF_THE_SAME_BRAND;

        $scope.c.shopsNearThatHaveNeededProducts = [];
        $scope.c.missingProducts = [];

        // init localization array
        $scope.c.localize = document.localize;
        document.selectLanguage('heb');

        $scope.c.lastAddress = localStorage.getItem('lastAddress') || "";

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

        function CheckConnection() {
            if (!MiscFunctions.IsConnectedToInternet()) {
                var popUpText = $scope.c.localize.strings['NoInternetConnection'];
                PopUpFactory.ErrorPopUp($scope, popUpText);
            }
        }

        // to distinguish real devices from development environment , we set a variable in local storage
        document.addEventListener("deviceready", function () {
            // Check for internet connection
            CheckConnection($scope);
            localStorage.setItem('IsRunningOnDevice', 1);
        }, false);

        document.addEventListener("deviceready", function () {
            $cordovaGoogleAnalytics.startTrackerWithId('UA-61254051-2');
            var UUID = localStorage.getItem('UUID') || "";
            if (UUID == "")
            {
                UUID = generateGuid();
                localStorage.setItem('UUID', UUID);
            }
            $cordovaGoogleAnalytics.setUserId(UUID);
        }, false);

        document.addEventListener("resume", function () {
            // app comes from background check if after user clicked settings button
            var userClickedSettingsLocation = localStorage.getItem('UserClickedSettingsLocation') || "0";
            userClickedSettingsLocation = (userClickedSettingsLocation == "1");

            if (MiscFunctions.IsConnectedToInternet()) {
                if (userClickedSettingsLocation) {
                    $scope.c.useUsersCurrentLocation = true;
                    $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                    UpdateStores.UpdateStoresInfoIfRequired($scope).then(function () {
                        $scope.c.HideLoading();
                        localStorage.setItem('UserClickedSettingsLocation', 0);
                        localStorage.setItem('UseUsersCurrentLocation', $scope.c.useUsersCurrentLocation ? 1 : 0);
                    });
                }
            } else {
                var popUpText = '';
                if (userClickedSettingsLocation) {
                    $scope.c.useUsersCurrentLocation = false;
                    popUpText = $scope.c.localize.strings['NoInternetConnectionCannotFinishDownloadingAllStores'];
                } else {
                    popUpText = $scope.c.localize.strings['NoInternetConnection'];
                }
                PopUpFactory.ErrorPopUp($scope, popUpText);
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
                var previousRangeForShops = parseInt(localStorage.getItem('RangeForShops') || ComparePricesConstants.DEFAULT_SHOPS_RANGE);
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

                // get maximum radius value
                var maxRangeForShops = parseInt(localStorage.getItem('MaxRangeForShops') || ComparePricesConstants.DEFAULT_SHOPS_RANGE);
                if (parseInt($scope.c.rangeForShops) > maxRangeForShops) {
                    // Check for internet connection
                    if (MiscFunctions.IsConnectedToInternet()) {
                        localStorage.setItem('MaxRangeForShops', $scope.c.rangeForShops);
                        // Need to recalculate and create missing stores info
                        $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                        UpdateStores.UpdateStoresInfo($scope, lat, lon, $scope.c.rangeForShops).then(function () {
                            $scope.c.HideLoading();
                        });
                    } else {
                        // if there's no connection and we have to update stores list revert the value of shops range back
                        $scope.c.rangeForShops = previousRangeForShops;
                        localStorage.setItem('RangeForShops', previousRangeForShops);
                        var popUpText = $scope.c.localize.strings['NoInternetConnectionCannotUpdateStoresInRange'];
                        PopUpFactory.ErrorPopUp($scope, popUpText);
                    }
                }
            },500);
        };

        $scope.c.ClearShowPriceDetailsForShop = function(){
            for (var i=0; i<$scope.c.maxShopsToShow; i++) {
                $scope.c.showPriceDetailsForShop[i] = 0;
            }
            // used for missing products
            $scope.c.showPriceDetailsForShop[1000] = 0;
        };

        // toggle button allow my current location
        $scope.c.LocationToggleChanged = function() {
            if ($scope.c.useUsersCurrentLocation) {
                $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                UpdateStores.UpdateStoresInfoIfRequired($scope).then(function (isConnectedToInternet) {
                    $scope.c.HideLoading();
                    if (isConnectedToInternet) {
                        localStorage.setItem('UseUsersCurrentLocation', $scope.c.useUsersCurrentLocation ? 1 : 0);
                    } else {
                        $scope.c.useUsersCurrentLocation = false;
                        var popUpText = $scope.c.localize.strings['NoInternetConnectionCannotFinishDownloadingAllStores'];
                        PopUpFactory.ErrorPopUp($scope, popUpText);
                    }
                });
            } else {
                localStorage.setItem('UseUsersCurrentLocation', $scope.c.useUsersCurrentLocation ? 1 : 0);
            }
        };

        $scope.c.OpenWaze = function(lat, lng) {
            if (((localStorage.getItem('IsRunningOnDevice') || "0") != "0")) {
                WazeLink.open('waze://?ll=' + lat + ',' + lng);
            }
        };

        $scope.c.OpenGoogleMaps = function(storeLat, storeLon) {
                var myLat = localStorage.getItem('Lat');
                var myLon = localStorage.getItem('Lon');

                launchnavigator.navigate(
                [storeLat, storeLon],
                [myLat, myLon],
                function () {
                    alert("Plugin success");
                },
                function (error) {
                    alert("Plugin error: " + error);
                }, {preferGoogleMaps: true});
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

        // 2 functions for toggling accordion in best_shops.html
        $scope.toggleDetails = function(shopId, numOfItems) {
            // in case we have only 1 item we don't have accordion, and don't want to toggle the color of the item-stable
            if (numOfItems > 1)
            {
                if ($scope.isDetailsShown(shopId)) {
                    $scope.c.showPriceDetailsForShop[shopId] = 0;
                } else {
                    $scope.c.showPriceDetailsForShop[shopId] = 1;
                }
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

    .controller('ProductGroupsCtrl', function($scope, ComparePricesStorage, PrepareInfoForControllers, FindBestShops, $ionicFilterBar, ionicMaterialMotion, ionicMaterialInk) {

        // TODO: try to implement the bar without all structures
        $scope.data = {};
        $scope.data.allProductsFiltered = [];
        $scope.data.showSearchResults   = false;

        $scope.CancelFilterBar = undefined;

        if ($scope.c.allProducts.length == 0) {
            ComparePricesStorage.GetAllProducts(function (result) {
                $scope.c.allProducts    = result.rows;
            });
        }

        $scope.c.productGroupsInfo = PrepareInfoForControllers.GetProductGroups();

        $scope.OpenProductGroupDetails = function(productGroupID) {
            setTimeout(function()
            {
                $scope.c.productGroupsInfo.forEach(function(singleProductGroup) {
                    if (singleProductGroup['ProductGroupID'] == productGroupID)
                    {
                        $scope.c.currentProductGroupName = singleProductGroup['ProductGroupName'];
                    }
                });

                location.href="#/tab/productGroups/products/" + productGroupID
            },100);
        };

        $scope.FindBestShop = function(productID, productName, productImage) {
            if ($scope.c.lastAddress == '')
            {
                if (typeof ($scope.CancelFilterBar) != "undefined") {
                    $scope.CancelFilterBar();
                }
                $scope.c.HandleAddressIsNotSet();
            }
            else
            {
                var structForFindBestShop = [];
                structForFindBestShop['ItemCode'] = productID;
                structForFindBestShop['ItemName'] = productName;
                structForFindBestShop['ImagePath'] = productImage;
                structForFindBestShop['Amount'] = 1;

                FindBestShops($scope, [structForFindBestShop]);
            }
        };

        // based on https://github.com/djett41/ionic-filter-bar
        $scope.ShowFilterBar = function () {
            $scope.CancelFilterBar = $ionicFilterBar.show({
                // items gets the array to filter
                items: $scope.c.allProducts,
                // this function is called when filtering is done
                // we take filtered items and place items that already in cart in the top of the list
                update: function (filteredItems) {
                    $scope.c.showSearchBar = 1;
                    $scope.data.showSearchResults   = true;
                    $scope.data.allProductsFiltered = filteredItems;
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

        $scope.$on('$ionicView.afterEnter', function(){
            setTimeout(function() {
                ionicMaterialMotion.blinds();
                ionicMaterialInk.displayEffect();
            }, 50);
        });
    })

    .controller('ProductsCtrl', function($scope, $stateParams, $ionicHistory, ComparePricesStorage, FindBestShops, PopUpFactory, ComparePricesConstants, ImageCache, ionicMaterialInk) {

        $scope.myProductGroup = [];
        $scope.productGroupID = $stateParams.productGroupID;

        ComparePricesStorage.GetProductGroup($scope.productGroupID, function(result) {
            $scope.$apply(function() {
                $scope.myProductGroup = result.rows;
                console.log($scope.myProductGroup);
            });
        });

        $scope.FindBestShop = function(productID) {
            if ($scope.c.lastAddress == '')
            {
                $scope.c.HandleAddressIsNotSet();
            }
            else
            {
                var structForFindBestShop = [];
                for (var i=0; i < $scope.myProductGroup.length; i++) {
                    if ($scope.myProductGroup[i]['ItemCode'] == productID) {
                        structForFindBestShop['ItemCode'] = $scope.myProductGroup[i]['ItemCode'];
                        structForFindBestShop['ItemName'] = $scope.myProductGroup[i]['ItemName'];
                        structForFindBestShop['ImagePath'] = $scope.myProductGroup[i]['ImagePath'];
                        structForFindBestShop['Amount'] = 1;
                        break;
                    }
                }
                FindBestShops($scope, [structForFindBestShop]);
            }
        };

        $scope.$on('$ionicView.afterEnter', function(){
            setTimeout(function() {
                ionicMaterialInk.displayEffect();
            }, 50);
        });
    })

    .controller('MyCartsCtrl', function($scope, $timeout, $ionicPopup, PopUpFactory, ComparePricesStorage, ComparePricesConstants, PrepareInfoForControllers, ionicMaterialInk, ionicMaterialMotion) {

        $scope.newCartName = "";

        if (typeof ($scope.c.myCartsInfo) == "undefined") {
            $scope.c.myCartsInfo = PrepareInfoForControllers.GetUserCarts();
        }
        if (typeof ($scope.c.hasUserCarts) == "undefined") {
            $scope.c.hasUserCarts = PrepareInfoForControllers.GetHasUserCarts();
        }

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

        // TODO: return my popup and handle the response in calling function. same way as in confirm delete product
        // TODO: make pop-ups as service?
        $scope.CreateNewCart = function() {
            // An elaborate, custom popup
            $scope.popupData = {};
            $scope.popupData.newCartName = "";
            var placeHolder = ($scope.lastCartID == 100) ? $scope.c.localize.strings['Cart'] : $scope.c.localize.strings['Cart'] + ' ' + ($scope.lastCartID - 99);
            var myPopup = $ionicPopup.show({
                template: '<label class="item item-input"><input style="text-align:right; padding-right: 10px;" type="text" ng-model="popupData.newCartName", placeholder="' + placeHolder + '"></label>',
                cssClass: 'non-transparent-pop-up',
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
            $timeout(function() {
                ionicMaterialInk.displayEffect();
            }, 0);
            myPopup.then(function(res) {
                if (res == 'CancelButtonPressed') {
                    return;
                }

                var newCartInfo = {'CartID'  : $scope.lastCartID,
                                   'CartName': res,
                                   'ImageUrl': ComparePricesConstants.DEFAULT_IMAGE_URL,
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

        $scope.$on('$ionicView.afterEnter', function(){
            setTimeout(function() {
                ionicMaterialMotion.blinds();
                ionicMaterialInk.displayEffect();
            }, 50);
        });
    })

    .controller('CartDetailsCtrl', function($scope, $stateParams, $ionicHistory, PrepareInfoForControllers, ComparePricesStorage, FindBestShops, PopUpFactory, ComparePricesConstants, ImageCache, ionicMaterialInk, $ionicFilterBar) {
        // ionic related variables. Used to create advanced  <ion-list>
        $scope.shouldShowDelete = false;

        // TODO: try to implement the bar without all structures
        $scope.data = {};
        $scope.data.allProductsFiltered = [];
        $scope.data.showSearchResults   = false;

        $scope.myCart      = [];
        $scope.cartID = $stateParams.cartID;

        $scope.myCart = PrepareInfoForControllers.GetMyCart();

        if ($scope.c.allProducts.length == 0) {
            ComparePricesStorage.GetAllProducts(function (result) {
                $scope.c.allProducts    = result.rows;
            });
        }

        $scope.FindBestShop = function() {
            if ($scope.c.lastAddress == '')
            {
                $scope.c.HandleAddressIsNotSet();
            }
            else
            {
                // check if location changed, if yes download new stores. After it find best shop
                FindBestShops($scope, $scope.myCart);
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
                    if ((numOfUserCarts == 1) && ($scope.c.myCartsInfo[cartIndex]['IsPredefined'] == 0)) {  // user had last cart and deletes it
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

        // based on https://github.com/djett41/ionic-filter-bar
        $scope.ShowFilterBar = function () {
            $ionicFilterBar.show({
                // items gets the array to filter
                items: $scope.c.allProducts,
                // this function is called when filtering is done
                // we take filtered items and place items that already in cart in the top of the list
                update: function (filteredItems) {
                    $scope.c.showSearchBar = 1;
                    $scope.data.showSearchResults   = true;
                    $scope.data.allProductsFiltered = [];

                    var numOfProductsInCart     = $scope.myCart.length;
                    var numOfFilteredProducts   = filteredItems.length;

                    // Add products that appear in my cart
                    for (var i=0; i < numOfProductsInCart; i++) {
                        for (var j=0; j < numOfFilteredProducts; j++) {
                            if ($scope.myCart[i]['ItemCode'] == filteredItems[j]['ItemCode']) {
                                $scope.data.allProductsFiltered.push(angular.copy($scope.myCart[i]));
                                break;
                            }
                        }
                    }
                    // Now add products that don't exist in the cart
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

        $scope.$on('$ionicView.afterEnter', function(){
            setTimeout(function() {
                ionicMaterialInk.displayEffect();
            }, 50);
        });
});
