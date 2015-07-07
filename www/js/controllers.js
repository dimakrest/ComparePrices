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


    .controller('MyCartCtrl', function($scope, ComparePricesStorage) {

        $scope.myCart = []
        // TODO: if i update the cart and then go back, nothing is changed
        ComparePricesStorage.GetMyCart(function(result) {
            $scope.myCart = result.rows
        })

        $scope.FindBestShop = function() {
            // At first get from myCart only ItemCodes
            var productCodesinMyCart = []
            $scope.myCart.forEach(function(singleItem) {
               productCodesinMyCart.push(singleItem['ItemCode'])
            });

            ComparePricesStorage.GetProductsForEachShopByItemCode(productCodesinMyCart, function(result) {

                var priceInAmPM = 0.0;
                result['AM_PM'].rows.forEach(function(product) {
                    priceInAmPM += parseFloat(product['ItemPrice'])
                });

                var priceInMega = 0.0;
                result['Mega'].rows.forEach(function(product) {
                    priceInMega += parseFloat(product['ItemPrice'])
                });

                var priceInSuperSal = 0.0;
                result['SuperSal'].rows.forEach(function(product) {
                    priceInSuperSal += parseFloat(product['ItemPrice'])
                });

                ComparePricesStorage.GetStoresInRadius(15, function(storesInRadius) {
                    alertMessage = "AM_PM Price: " + priceInAmPM + "\n" +
                        "Mega Price: " + priceInMega + "\n" +
                        "SuperSal Price: " + priceInSuperSal + "\n " +
                        "stores near you " + storesInRadius
                    alert(alertMessage)
                })
            });
        }

        $scope.ClearMyCart = function() {
            $scope.myCart = {}
            ComparePricesStorage.ClearMyCart()
        }
    })

    .controller('CreateCartCtrl', function($scope, ComparePricesStorage) {
        $scope.searchQuery = ""

        $scope.clearSearch = function()
        {
            $scope.searchQuery = ""
        }

        ComparePricesStorage.GetAllProducts(function(result) {
            $scope.allProducts = result.rows
        })

        $scope.ItemWasClicked = function(clickedItem) {
            ComparePricesStorage.InsertItemToCart(clickedItem)
        }
     });
