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
                                     MiscFunctions, SortShops, $ionicPopover, UpdatesFromServer, $cordovaEmailComposer, $ionicScrollDelegate, FindBestShops, ShowModal, $ionicTabsDelegate) {
        $scope.c = {};
        $scope.c.currentCartName = "";
        $scope.c.currentProductGroupName = "";
        $scope.c.isCurrentCartPredefined    = 0;
        $scope.c.comparedProducts = [];
        $scope.c.showPriceDetailsForShop = [];
        $scope.c.currentlyShopsDownloaded = 0;
        $scope.c.currentlyShopsDownloadedPercentage = 0;
        $scope.c.globalProgressLoadingPointer = "";

        $scope.c.shopsNearThatHaveNeededProducts = [];
        $scope.c.allShopsNearThatHaveNeededProducts = [];

        $scope.c.shopsNearThatHaveAllProducts = [];
        $scope.c.allShopsNearThatHaveAllProducts = [];

        $scope.c.missingProducts = [];
        $scope.c.filteredProductsToShow = [];
        $scope.c.myCart      = [];
        // init localization array
        $scope.c.localize = document.localize;
        document.selectLanguage('heb');
        $scope.c.SortShopsByDistance = 0;

        $scope.c.lastAddress = localStorage.getItem('lastAddress') || "";

        $scope.c.rangeForShops = parseInt(localStorage.getItem('RangeForShops')) || ComparePricesConstants.DEFAULT_SHOPS_RANGE;

        $scope.c.useUsersCurrentLocation = parseInt(localStorage.getItem('UseUsersCurrentLocation')) || 0;
        $scope.c.useUsersCurrentLocation = $scope.c.useUsersCurrentLocation == 1;

        $scope.c.CancelFilterBar = undefined;

        $scope.SelectTabWithIndex = function(index) {
            if (typeof($scope.c.CancelFilterBar) != "undefined") {
                $scope.c.CancelFilterBar();
            } else {
                $ionicTabsDelegate.select(index);
            }
        };


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
                PopUpFactory.ErrorPopUp($scope, popUpText, true);
            }
        }

        function StartGoogleAnalytics() {
            $cordovaGoogleAnalytics.startTrackerWithId('UA-61254051-2');
            var UUID = localStorage.getItem('UUID') || "";
            if (UUID == "")
            {
                UUID = generateGuid();
                localStorage.setItem('UUID', UUID);
            }
            $cordovaGoogleAnalytics.setUserId(UUID);
        }

        document.addEventListener("deviceready", function () {
            // Check for internet connection
            CheckConnection($scope);

            // to distinguish real devices from development environment , we set a variable in local storage
            localStorage.setItem('IsRunningOnDevice', 1);

            // init and start google analytics
            StartGoogleAnalytics();

            // check if new stores version is available
            UpdatesFromServer.CheckIfUpdateIsRequired();
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
                    popUpText = $scope.c.localize.strings['NoInternetConnectionCannotUpdateStoresInRange'];
                } else {
                    popUpText = $scope.c.localize.strings['NoInternetConnection'];
                }
                PopUpFactory.ErrorPopUp($scope, popUpText, true);
            }

            // check if new stores version is available
            UpdatesFromServer.CheckIfUpdateIsRequired();
        }, false);

        // In order to get the version in browser use this wa
        var isRunningOnDevice = localStorage.getItem('IsRunningOnDevice') || 0;
        if (isRunningOnDevice == 0) {
            UpdatesFromServer.CheckIfUpdateIsRequired();
        }

        $scope.c.SortShopsBy = function(sortBy) {
            if (sortBy == "price")
            {
                $scope.c.SortShopsByDistance = 0;
                SortShops.SortAndLimitAmount($scope, "CartPrice", "Distance");
            }
            else // distance
            {
                $scope.c.SortShopsByDistance = 1;
                SortShops.SortAndLimitAmount($scope, "Distance", "CartPrice");
            }
        }

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
                // has to use minimal value as a default, because if user changes to 1 and then downloads stores and after this changes value to
                // 2 or three, new stores are not downloaded if DEFAULT_SHOPS_RANGE is used
                var maxRangeForShops = parseInt(localStorage.getItem('MaxRangeForShops') || 1);
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
                        PopUpFactory.ErrorPopUp($scope, popUpText, true);
                    }
                }
            },500);
        };

        // Popover for missing products in best_shops window
        $scope.openPopoverMissingProducts = function($event) {
            if ((typeof($scope.popover) != "undefined") && ($scope.popover.isShown())) {
                return;
            }
            var template = '<ion-popover-view class="fit"><ion-content scroll="false"> ' +
                '<h5 style="direction: rtl; white-space: pre-line; text-align:right; margin-top: 5px;"> ' +
                '{{c.localize.strings["ShowShopsThatPartiallySuit"]}}' +
                '</h5> <div class="settings-border-divider"></div> <h5 style="text-align:right; padding-right:10px;">';

            for (var i = 0; i < $scope.c.missingProducts.length; i++) {
                var missingProductCode = $scope.c.missingProducts[i];
                template += $scope.c.comparedProducts[missingProductCode].Name + '<br>';
            }

            template += '</h5></ion-content></ion-popover-view>';

            $scope.popover = $ionicPopover.fromTemplate(template, {
                scope: $scope
            });
            $scope.popover.show($event);
        };

        // Popover for having all products in best_shops window
        $scope.openPopoverHaveAllProducts = function($event) {
            if ((typeof($scope.popover) != "undefined") && ($scope.popover.isShown())) {
                return;
            }
            var template = '<ion-popover-view class="fit"><ion-content scroll="false"> ' +
                '<h5 style="direction: rtl; white-space: pre-line; text-align:right; margin-top: 5px;"> ' +
                '{{c.localize.strings["FullyComparisonMade"]}}' +
                '</h5></ion-content></ion-popover-view>';

            $scope.popover = $ionicPopover.fromTemplate(template, {
                scope: $scope
            });
        $scope.popover.show($event);
        };

        // closePopover and remove are not called
        $scope.closePopover = function() {
            $scope.popover.hide();
        };
        //Cleanup the popover when we're done with it!
        $scope.$on('$destroy', function() {
            $scope.popover.remove();
        });

        $scope.c.ClearShowPriceDetailsForShop = function(){
            for (var i=0; i < ComparePricesConstants.DEFAULT_MAX_SHOPS_TO_SHOW; i++) {
                $scope.c.showPriceDetailsForShop[i] = 0;
            }
        };

        // toggle button allow my current location
        $scope.c.LocationToggleChanged = function() {
            if ($scope.c.useUsersCurrentLocation) {
                $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                UpdateStores.UpdateStoresInfoIfRequired($scope).then(function (isConnectedToInternet) {
                    $scope.c.HideLoading();
                    if (isConnectedToInternet == 1) {
                        localStorage.setItem('UseUsersCurrentLocation', $scope.c.useUsersCurrentLocation ? 1 : 0);
                    } else if (isConnectedToInternet == 0) {
                        $scope.c.useUsersCurrentLocation = false;
                        var popUpText = $scope.c.localize.strings['NoInternetConnectionCannotUpdateStoresInRange'];
                        PopUpFactory.ErrorPopUp($scope, popUpText, true);
                    }
                });
            } else {
                localStorage.setItem('UseUsersCurrentLocation', $scope.c.useUsersCurrentLocation ? 1 : 0);
            }
        };

        $scope.c.OpenWaze = function(lat, lng) {
            if (((localStorage.getItem('IsRunningOnDevice') || "0") != "0")) {
                WazeLink.open('waze://?ll=' + lat + ',' + lng + '&navigate=yes');
            }
        };

        $scope.c.OpenGoogleMaps = function(storeLat, storeLon) {
                var myLat = localStorage.getItem('Lat');
                var myLon = localStorage.getItem('Lon');

                launchnavigator.navigate(
                [storeLat, storeLon],
                [myLat, myLon],
                function () {
                },
                function (error) {
                }, {});
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
            setTimeout(function() {
                $ionicLoading.hide();
            }, 0);
        };

        // 2 functions for toggling accordion in best_shops.html
        $scope.ToggleDetails = function(shopId) {
            if ($scope.IsDetailsShown(shopId)) {
                $scope.c.showPriceDetailsForShop[shopId] = 0;
            } else {
                $scope.c.showPriceDetailsForShop[shopId] = 1;
            }
            // to fix the scrolling bug in best_shops modal
            $ionicScrollDelegate.$getByHandle('modalContent').freezeScroll(true);
            setTimeout(function() {
                $ionicScrollDelegate.$getByHandle('modalContent').freezeScroll(false);
                $ionicScrollDelegate.$getByHandle('modalContent').resize();
            }, 350);
        };

        $scope.IsDetailsShown = function(shopId) {
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

        $scope.c.HandleAddressIsNotSet = function($scope, cartToCheck) {
            var title = $scope.c.localize.strings['ChooseYourAddressInSettings'];
            var noButtonText    = $scope.c.localize.strings['CurrentLocationText'];
            var yesButtonText   = $scope.c.localize.strings['AddrManualText'];
            PopUpFactory.ConfirmationPopUpVerticalButtons($scope, title, '', yesButtonText, noButtonText).then(function(confirmed) {
                if(confirmed) {
                    $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                    UpdateStores.UpdateStoresInfoIfRequired($scope).then(function (isConnectedToInternet) {
                        $scope.c.HideLoading();
                        if (isConnectedToInternet == 1) {
                            $scope.c.useUsersCurrentLocation = true;
                            localStorage.setItem('UseUsersCurrentLocation', $scope.c.useUsersCurrentLocation ? 1 : 0);
                            FindBestShops($scope, cartToCheck);
                        } else if (isConnectedToInternet == 0) {
                            $scope.c.useUsersCurrentLocation = false;
                            var popUpText = $scope.c.localize.strings['NoInternetConnectionCannotUpdateStoresInRange'];
                            PopUpFactory.ErrorPopUp($scope, popUpText, true);
                        }
                    });
                } else {
                    $ionicSideMenuDelegate.toggleRight();
                }
            });
        };

        $scope.c.Help = function() {
            var email = {
                to: 'shnyaga.app@gmail.com',
                subject: 'Help request',
                body: "<small>" + (new Date()) + "</small></small>",
                isHtml: true
            };
            $cordovaEmailComposer.open(email).then(null, null);
        };

        $scope.c.HowWeDoThis = function() {
            ShowModal($scope, 'templates/how_we_do_this.html').then(function (modal) {
                $scope.modal = modal;
                $scope.modal.show();

                $scope.modal.close = function () {
                    $scope.modal.remove()
                };
            });
        };

        // this function is called from search bar in product groups
        $scope.c.FindBestShopProductGroups = function(productID, productName, productImage) {
            var structForFindBestShop = [];
            structForFindBestShop['ItemCode'] = productID;
            structForFindBestShop['ItemName'] = productName;
            structForFindBestShop['ImagePath'] = productImage;
            structForFindBestShop['Amount'] = 1;

            if ($scope.c.lastAddress == '')
            {
                if (typeof ($scope.c.CancelFilterBar) != "undefined") {
                    $scope.c.CancelFilterBar($scope, [structForFindBestShop]);
                }
                $scope.c.HandleAddressIsNotSet($scope, [structForFindBestShop]);
            }
            else
            {
                FindBestShops($scope, [structForFindBestShop]);
            }
        };

        $scope.c.UpdateProductAmountInMyCart = function(itemInfo, amountToAdd) {
            var numOfProductsInCart = $scope.c.myCart.length;
            var productIndex        = -1;
            for (var i=0; i < numOfProductsInCart; i++) {
                if ($scope.c.myCart[i]['ItemCode'] == itemInfo['ItemCode']) {
                    productIndex = i;
                    break;
                }
            }
            // new product added, need to cache image, we cache only images for products in cart
            if (productIndex == -1) {
                var newItemInCart = {'CartID': $scope.c.cartID,
                    'ItemCode': itemInfo['ItemCode'],
                    'ItemName': itemInfo['ItemName'],
                    'ImagePath': itemInfo['ImagePath'],
                    'Amount': parseInt(amountToAdd)};
                $scope.c.myCart.push(newItemInCart);
                ComparePricesStorage.UpdateCart($scope.c.cartID, $scope.c.myCart);
            } else {
                $scope.c.myCart[productIndex]['Amount'] += parseInt(amountToAdd);
                ComparePricesStorage.UpdateCart($scope.c.cartID, $scope.c.myCart);
            }
        };
    })

    .controller('ProductGroupsCtrl', function($scope, $ionicScrollDelegate, FindBestShops, GroupsAndSubGroups, $ionicHistory, $ionicPopover) {
        $scope.isGroupOpen      = {};
        $scope.isSubGroupOpen   = {};
        $scope.openGroupID      = -1;
        $scope.openSubGroupID   = 0;
        $scope.c.showTipInProductGroups = localStorage.getItem('showTipInProductGroups') || 1;
        localStorage.setItem('showTipInProductGroups', 0);

        $scope.productGroupsInfo    = [];
        GroupsAndSubGroups.InitProductGroupsAndSubGroups($scope);

        $scope.GroupWasClicked = function(groupIndex) {
            var offsetToScroll = 0;
            if ($scope.c.showTipInProductGroups == 1) {
                var tipInProductGroups = document.getElementById('tipInProductGroups');
                offsetToScroll = parseInt(tipInProductGroups.offsetHeight);
                if (typeof (tipInProductGroups.style['margin-top']) != "undefined") {
                    offsetToScroll += parseInt(tipInProductGroups.style['margin-top']);
                }
                if (typeof (tipInProductGroups.style['margin-bottom']) != "undefined") {
                    offsetToScroll += parseInt(tipInProductGroups.style['margin-bottom']);
                }
            }
            var ionicScrollDelegate = $ionicScrollDelegate.$getByHandle('productGroupsContent');
            GroupsAndSubGroups.AddProductsAndCloseAccordions($scope, groupIndex, ionicScrollDelegate, offsetToScroll);
        };

        $scope.FindBestShop = function(productInfo) {
            productInfo['Amount'] = 1;
            if ($scope.c.lastAddress == '')
            {
                $scope.c.HandleAddressIsNotSet($scope, [productInfo]);
            }
            else
            {
                FindBestShops($scope, [productInfo]);
            }
        };

        // based on https://github.com/djett41/ionic-filter-bar
        $scope.ShowFilterBar = function () {
            $ionicHistory.nextViewOptions({
                disableAnimate: true
            });
            setTimeout(function() {
                location.href = '#/tab/searchBarProductGroups';
            }, 100);
        };

        // Popover for missing products in best_shops window
        $scope.ShowSearchToolTip = function() {
            if ((typeof($scope.popover) != "undefined") && ($scope.popover.isShown())) {
                return;
            }
            var template = '<ion-popover-view class="fit"><ion-content scroll="false"> ' +
                '<h5 style="white-space: pre-line; text-align:center; margin-top: 5px; direction: rtl;"> ' +
                '{{c.localize.strings["SearchTooltip1"]}}<br>{{c.localize.strings["SearchTooltip2"]}}' +
                '</h5> <div class="settings-border-divider"></div> <h5 style="text-align:right; padding-right:10px;">';

            template += '</h4></ion-content></ion-popover-view>';

            $scope.popover = $ionicPopover.fromTemplate(template, {
                scope: $scope
            });

            $scope.popover.show(document.getElementById('productGroupsTooltipPosition'));
        };

        // closePopover is not called
        $scope.closePopover = function() {
            $scope.popover.hide();
        };

        //Cleanup the popover when we're done with it!
        $scope.$on('$destroy', function() {
            if (typeof($scope.popover) != "undefined") {
                $scope.popover.remove();
            }
        });
    })

    .controller('MyCartsCtrl', function($scope, $timeout, $ionicPopup, PopUpFactory, ComparePricesStorage, ComparePricesConstants, PrepareInfoForControllers, ionicMaterialMotion) {

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
            var placeHolder = $scope.c.localize.strings['Cart'] + ' ' + ($scope.lastCartID - 99);
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
            }, 0);
        });
    })

    .controller('SearchBarGroupsCtrl', function($scope, $ionicPlatform, $ionicFilterBar, $ionicHistory, ComparePricesStorage) {
        $scope.c.filteredProductsToShow = [];
        $scope.showNoResults    = false;

        $scope.ionContentTopSearchBar = 'android-content-top-search-bar';
        var isRunningOnDevice = localStorage.getItem('IsRunningOnDevice') || 0;
        if (isRunningOnDevice) {
            $scope.ionContentTopSearchBar = $ionicPlatform.is('android') ? 'android-content-top-search-bar' : 'ios-content-top-search-bar';
        }

        $scope.$on('$ionicView.afterEnter', function () {
            $scope.c.CancelFilterBar = $ionicFilterBar.show({
                // items gets the array to filter
                items: [],

                // this function is called when filtering is done
                // we take filtered items and place items that already in cart in the top of the list
                update: function (filteredItems, searchPattern) {

                    if (searchPattern == "" || searchPattern == undefined) // when we press in X in search bar
                    {
                        $scope.c.filteredProductsToShow = [];
                        $scope.showNoResults = false;
                    }
                    else
                    {
                        var isItemCode = 0;
                        if (/^[0-9]{5,}$/.test(searchPattern))
                        {
                            isItemCode = 1;
                        }

                        var firstWord = searchPattern.split(' ')[0];
                        var firstWordMatcher = new RegExp("/b" + firstWord + "/b");

                        searchPattern = searchPattern.replace(/\s/g, '%'); // replace spaces by wildcards
                        searchPattern = '%' + searchPattern + '%'; // add wildcards to the beginning and ending

                        ComparePricesStorage.GetProductsBySearchPattern(searchPattern, isItemCode).then(function (results) {

                            var foundItems = results.rows;

                            // sort items by rules, first come whole words and when word appears closer to beginning
                            foundItems.sort(function(a,b){
                                if ((firstWordMatcher.test(a.ItemName)) && (!firstWordMatcher.test(b.ItemName))) // A has the whole word while B don't
                                {
                                    return -1;
                                }
                                if ((firstWordMatcher.test(b.ItemName)) && (!firstWordMatcher.test(a.ItemName))) // B has the whole word while A don't
                                {
                                    return 1;
                                }
                                if (a.ItemName.indexOf(firstWord) < b.ItemName.indexOf(firstWord)) // in A string appears earlier
                                {
                                    return -1;
                                }
                                if (b.ItemName.indexOf(firstWord) < a.ItemName.indexOf(firstWord)) // in B string appears earlier
                                {
                                    return 1;
                                }
                                if (a.ImagePath != "img/no_product_img.jpg" && b.ImagePath == "img/no_product_img.jpg") // A has image, while B doesn't
                                {
                                    return -1;
                                }
                                if (b.ImagePath != "img/no_product_img.jpg" && a.ImagePath == "img/no_product_img.jpg") // B has image, while A doesn't
                                {
                                    return 1;
                                }
                                return 0; // in all other cases strings have equal strength
                            });

                            $scope.showNoResults = (foundItems.length == 0);
                            $scope.c.filteredProductsToShow = foundItems;
                        });
                    }
                },

                // Called after the filterBar is removed. This can happen when the cancel button is pressed, the backdrop is tapped
                // or swiped, or the back button is pressed.
                cancel: function () {
                    $scope.c.CancelFilterBar = undefined;
                    $scope.showNoResults     = false;
                    $scope.c.filteredProductsToShow   = [];
                    setTimeout(function() {
                        $ionicHistory.goBack();
                    }, 0);
                },
                debounce: true,
                cancelText: $scope.c.localize.strings['CancelSearch'],
                delay: 500,
                keyPressed: function () {
                },
                filterProperties: 'ItemName',
                backdrop : true
            });
        })
    })

    // TODO: merge common functions like update or something ...
    .controller('SearchBarCartDetailsCtrl', function($scope, $ionicPlatform, $ionicFilterBar, $ionicHistory, $ionicScrollDelegate, $ionicPopover, GroupsAndSubGroups, ComparePricesStorage) {
        $scope.c.filteredProductsToShow = [];
        $scope.showNoResults    = false;

        // Products group info for search:
        $scope.isGroupOpen      = {};
        $scope.isSubGroupOpen   = {};
        $scope.openGroupID      = -1;
        $scope.openSubGroupID   = 0;

        $scope.ionContentTopSearchBar = 'android-content-top-search-bar';
        var isRunningOnDevice = localStorage.getItem('IsRunningOnDevice') || 0;
        if (isRunningOnDevice) {
            $scope.ionContentTopSearchBar = $ionicPlatform.is('android') ? 'android-content-top-search-bar' : 'ios-content-top-search-bar';
        }

        $scope.productGroupsInfo    = [];
        GroupsAndSubGroups.InitProductGroupsAndSubGroups($scope);

        $scope.GroupWasClicked = function(groupIndex) {
            var ionicScrollDelegate = $ionicScrollDelegate.$getByHandle('searchBarCartsContent');
            var offsetToScroll = -36;
            GroupsAndSubGroups.AddProductsAndCloseAccordions($scope, groupIndex, ionicScrollDelegate, offsetToScroll);

            // need to go through products and check if they exist in cart
            var numOfProductsInCart = $scope.c.myCart.length;
            var numOfSubGroups      = $scope.productGroupsInfo[groupIndex]['SubGroups'].length;

            // Add products that appear in my cart
            for (var subGroupIndex = 0; subGroupIndex < numOfSubGroups; subGroupIndex++) {
                var productsInSubGroup = $scope.productGroupsInfo[groupIndex]['SubGroups'][subGroupIndex]['Products'];
                var numOfProductsInSubGroup = productsInSubGroup.length;
                for (var i = 0; i < numOfProductsInSubGroup; i++) {
                    var productFound = false;
                    for (var j=0; j < numOfProductsInCart; j++) {
                        if ($scope.c.myCart[j]['ItemCode'] == productsInSubGroup[i]['ItemCode']) {
                            productsInSubGroup[i]['Amount'] = $scope.c.myCart[j]['Amount'];
                            productFound = true;
                            break;
                        }
                    }
                    if (!productFound) {
                        productsInSubGroup[i]['Amount'] = 0;
                    }
                }
            }
        };

        $scope.$on('$ionicView.afterEnter', function () {
            $scope.c.CancelFilterBar = $ionicFilterBar.show({
                // items gets the array to filter
                items: [],

                // this function is called when filtering is done
                // we take filtered items and place items that already in cart in the top of the list
                update: function (filteredItems, searchPattern) {

                    if (searchPattern == "" || searchPattern == undefined) // when we press in X in search bar
                    {
                        $scope.c.filteredProductsToShow = [];
                        $scope.showNoResults = false;
                    }
                    else
                    {
                        var isItemCode = 0;
                        if (/^[0-9]{5,}$/.test(searchPattern))
                        {
                            isItemCode = 1;
                        }

                        var firstWord = searchPattern.split(' ')[0];
                        var firstWordMatcher = new RegExp("/b" + firstWord + "/b");

                        searchPattern = searchPattern.replace(/\s/g, '%'); // replace spaces by wildcards
                        searchPattern = '%' + searchPattern + '%'; // add wildcards to the beginning and ending

                        ComparePricesStorage.GetProductsBySearchPattern(searchPattern, isItemCode).then(function (results) {

                            var foundItems = results.rows;

                            // sort items by rules, first come whole words and when word appears closer to beginning
                            foundItems.sort(function(a,b){
                                if ((firstWordMatcher.test(a.ItemName)) && (!firstWordMatcher.test(b.ItemName))) // A has the whole word while B don't
                                {
                                    return -1;
                                }
                                if ((firstWordMatcher.test(b.ItemName)) && (!firstWordMatcher.test(a.ItemName))) // B has the whole word while A don't
                                {
                                    return 1;
                                }
                                if (a.ItemName.indexOf(firstWord) < b.ItemName.indexOf(firstWord)) // in A string appears earlier
                                {
                                    return -1;
                                }
                                if (b.ItemName.indexOf(firstWord) < a.ItemName.indexOf(firstWord)) // in B string appears earlier
                                {
                                    return 1;
                                }
                                if (a.ImagePath != "img/no_product_img.jpg" && b.ImagePath == "img/no_product_img.jpg") // A has image, while B doesn't
                                {
                                    return -1;
                                }
                                if (b.ImagePath != "img/no_product_img.jpg" && a.ImagePath == "img/no_product_img.jpg") // B has image, while A doesn't
                                {
                                    return 1;
                                }
                                return 0; // in all other cases strings have equal strength
                            });

                            $scope.showNoResults = (foundItems.length == 0);
                            $scope.c.filteredProductsToShow = [];

                            var numOfProductsInCart = $scope.c.myCart.length;
                            var numOfFilteredProducts = foundItems.length;

                            // Add products that appear in my cart
                            for (var i = 0; i < numOfProductsInCart; i++) {
                                for (var j = 0; j < numOfFilteredProducts; j++) {
                                    if ($scope.c.myCart[i]['ItemCode'] == foundItems[j]['ItemCode']) {
                                        var copyOfItemInCart = angular.copy($scope.c.myCart[i]);
                                        copyOfItemInCart['MinPrice'] = foundItems[i]['MinPrice'];
                                        copyOfItemInCart['MaxPrice'] = foundItems[i]['MaxPrice'];
                                        $scope.c.filteredProductsToShow.push(copyOfItemInCart);
                                        break;
                                    }
                                }
                            }
                            // Now add products that don't exist in the cart
                            for (var i = 0; i < numOfFilteredProducts; i++) {
                                var singleProduct = foundItems[i];
                                var productFound = false;

                                for (var j = 0; j < numOfProductsInCart; j++) {
                                    if ($scope.c.myCart[j]['ItemCode'] == singleProduct['ItemCode']) {
                                        productFound = true;
                                        break;
                                    }
                                }
                                if (!productFound) {
                                    singleProduct['Amount'] = 0;
                                    $scope.c.filteredProductsToShow.push(singleProduct);
                                }
                            }
                        });
                    }
                },

                // Called after the filterBar is removed. This can happen when the cancel button is pressed, the backdrop is tapped
                // or swiped, or the back button is pressed.
                cancel: function () {
                    $scope.c.CancelFilterBar = undefined;
                    $scope.showNoResults     = false;
                    $scope.c.filteredProductsToShow   = [];
                    setTimeout(function() {
                        $ionicHistory.goBack();
                    }, 0);
                },
                debounce: true,
                cancelText: $scope.c.localize.strings['CancelSearch'],
                delay: 500,
                keyPressed: function () {
                },
                filterProperties: 'ItemName',
                backdrop : false
            });
        });

        $scope.UpdateProductAmountFromGroups = function(product, amount) {
            product['Amount'] += parseInt(amount);
            $scope.c.UpdateProductAmountInMyCart(product, amount);
        };

        $scope.UpdateProductAmountFromSearch = function(product, amount) {
            var numOfFilteredProducts = $scope.c.filteredProductsToShow.length;
            for (var i=0; i < numOfFilteredProducts; i++) {
                if ($scope.c.filteredProductsToShow[i]['ItemCode'] == product['ItemCode']) {
                    $scope.c.filteredProductsToShow[i]['Amount'] += parseInt(amount);
                    break;
                }
            }
            $scope.c.UpdateProductAmountInMyCart(product, amount);
        };

        $scope.ShowSearchToolTip = function() {
            if ((typeof($scope.popover) != "undefined") && ($scope.popover.isShown())) {
                return;
            }
            var template = '<ion-popover-view class="fit"><ion-content scroll="false"> ' +
                '<h5 style="white-space: pre-line; text-align:center; margin-top: 5px; direction: rtl;"> ' +
                '{{c.localize.strings["SearchTooltip1"]}}<br>{{c.localize.strings["SearchTooltip2"]}}' +
                '</h5> <div class="settings-border-divider"></div> <h5 style="text-align:right; padding-right:10px;">';

            template += '</h4></ion-content></ion-popover-view>';

            $scope.popover = $ionicPopover.fromTemplate(template, {
                scope: $scope
            });

            $scope.popover.show(document.getElementById('filterBarTooltipPosition'));
        };

        // closePopover and remove are not called
        $scope.closePopover = function() {
            $scope.popover.hide();
        };
        //Cleanup the popover when we're done with it!
        $scope.$on('$destroy', function() {
            if (typeof($scope.popover) != "undefined") {
                $scope.popover.remove();
            }
        });
    })

    .controller('CartDetailsCtrl', function($scope, $stateParams, $ionicHistory, PrepareInfoForControllers, ComparePricesStorage, FindBestShops, PopUpFactory) {
        // ionic related variables. Used to create advanced  <ion-list>
        $scope.shouldShowDelete = false;

        $scope.c.cartID = $stateParams.cartID;
        $scope.c.myCart = PrepareInfoForControllers.GetMyCart();

        $scope.FindBestShop = function() {
            if ($scope.c.lastAddress == '')
            {
                $scope.c.HandleAddressIsNotSet($scope, $scope.c.myCart);
            }
            else
            {
                // check if location changed, if yes download new stores. After it find best shop
                FindBestShops($scope, $scope.c.myCart);
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
                        if ($scope.c.myCartsInfo[i]['CartID'] == $scope.c.cartID) {
                            cartIndex = i;
                        }
                    }
                    if ((numOfUserCarts == 1) && ($scope.c.myCartsInfo[cartIndex]['IsPredefined'] == 0)) {  // user had last cart and deletes it
                        $scope.c.hasUserCarts = 0;
                    }
                    if (cartIndex != -1) {
                        $scope.c.myCartsInfo.splice(cartIndex, 1);
                    }

                    ComparePricesStorage.DeleteCart($scope.c.cartID);
                    $ionicHistory.goBack();
                }
            });
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
                $scope.c.myCart.splice(productIndex, 1);
            }
            ComparePricesStorage.UpdateCart($scope.c.cartID, $scope.c.myCart);

            if ($scope.c.myCart.length == 0)
            {
                $scope.shouldShowDelete = false;
            }
        };

        $scope.ToggleDeleteValue = function() {
            $scope.shouldShowDelete = !$scope.shouldShowDelete;
        };

        // based on https://github.com/djett41/ionic-filter-bar
        $scope.ShowFilterBar = function () {
            $ionicHistory.nextViewOptions({
                disableAnimate: true
            });
            setTimeout(function() {
                location.href = '#/tab/searchBarCartDetails';
            }, 100);
        };
});
