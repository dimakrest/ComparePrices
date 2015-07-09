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

        $scope.myCart = {}
        // TODO: can I do this using promises?
        // TODO: if i update the cart and then go back, nothing is changed
        ComparePricesStorage.GetMyCart(function(result) {
            $scope.myCart = result.rows
        })

        $scope.FindBestShop = function() {
            // At first get from myCart only ItemCodes
            numOfProductsInCart = $scope.myCart.length
            productCodesinMyCart = []
            productCodesOccurrencesinMyCart = []
            for (var i=0; i < numOfProductsInCart; i++)
            {
                itemCode = $scope.myCart[i]['ItemCode']
                productCodesinMyCart.push(itemCode)
                if(typeof productCodesOccurrencesinMyCart[itemCode] === 'undefined') {
                    productCodesOccurrencesinMyCart[itemCode] = 1
                }
                else {
                    productCodesOccurrencesinMyCart[itemCode]++
                }
            }

            // TODO: there's a JS way to do this
            ComparePricesStorage.GetProductsForEachShopByItemCode(productCodesinMyCart, function(result) {
                var priceInAmPM = 0.0;
                for (var i=0; i < result['AM_PM'].rows.length; i++) {
                    priceInAmPM += parseFloat(result['AM_PM'].rows[i]['ItemPrice']) * productCodesOccurrencesinMyCart[result['AM_PM'].rows[i]['ItemCode']]
                }
                var priceInMega = 0.0;
                for (var i=0; i < result['Mega'].rows.length; i++) {
                    priceInMega += parseFloat(result['Mega'].rows[i]['ItemPrice']) * productCodesOccurrencesinMyCart[result['AM_PM'].rows[i]['ItemCode']]
                }
                var priceInSuperSal = 0.0;
                for (var i=0; i < result['SuperSal'].rows.length; i++) {
                    priceInSuperSal += parseFloat(result['SuperSal'].rows[i]['ItemPrice']) * productCodesOccurrencesinMyCart[result['AM_PM'].rows[i]['ItemCode']]
                }

                alert("AM_PM Price: " + priceInAmPM + "\n" +
                      "Mega Price: " + priceInMega + "\n" +
                      "SuperSal Price: " + priceInSuperSal)
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
