// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('unsecret', ['unsecret.services', 'unsecret.imageProcessing', 'ionic', 'unsecret.store'])
    .config(["$stateProvider", "$urlRouterProvider",function ($stateProvider, $urlRouterProvider) {


        $stateProvider.state('index', {
            url: '/',
            templateUrl: 'list',
            controller: ["$scope", "mainCommander", "profile", "secretsStorage", "$location", "$ionicActionSheet", "$timeout", "$ionicModal", "commonPlugins", "customPlugins", "imageWorker", "$ionicPopover", "$ionicPopup", function ($scope, mainCommander, profile, secretsStorage, $location, $ionicActionSheet, $timeout, $ionicModal, commonPlugins, customPlugins, imageWorker, $ionicPopover, $ionicPopup) {
                $ionicModal.fromTemplateUrl('imageProcessing', {
                    scope: $scope,
                    animation: 'slide-in-up',
                    backdropClickToClose: true
                }).then(function (modal) {
                        $scope.modal = modal;
                    });
                $scope.openModal = function () {
                    $scope.modal.show();
                };
                $scope.closeModal = function () {
                    $scope.modal.hide();
                };
                //Cleanup the modal when we're done with it!
                $scope.$on('$destroy', function () {
                    // $scope.modal.remove();
                });
                // Execute action on hide modal
                $scope.$on('modal.hidden', function () {
                    // Execute action
                });
                // Execute action on remove modal
                $scope.$on('modal.removed', function () {
                    // Execute action
                });


                $ionicPopover.fromTemplateUrl('upload_issue', {
                    scope: $scope
                }).then(function (popover) {
                        $scope.popover = popover;
                    });


                $scope.openPopover = function ($event) {
                    $scope.popover.show($event);
                };


                $scope.imageOptions = function () {

                    if (navigator.connection.type == "none") {
                        $scope.c.errorHandler()("no_connection")
                    }
                    else {
                        // Show the action sheet
                        var hideSheet = $ionicActionSheet.show({
                            buttons: [
                                { text: 'Choose secret screenshot' }
                            ],
                            titleText: 'Select secret post to solve',
                            cancelText: 'Cancel',
                            cancel: function () {
                                // add cancel code..
                            },
                            buttonClicked: function (index) {
                                hideSheet();
                                commonPlugins.getCameraImage(function (image) {


                                    if (!!(1 * profile.showAds()) && !(1 * profile.wasInapp()) && DEBUG == 0) {
                                        window.plugins.AdMob.createInterstitialView();
                                    }

                                    console.log("getCameraImage: Success")
                                    $scope.c.isSecretValid = 0
                                    $scope.c.progress = "Loading image..."
                                    $scope.c.explanation = "Submit full-screen secret with opened comments"

                                    if (!!(1 * profile.showAds()) && !(1 * profile.wasInapp()) && DEBUG == 0) {
                                        window.plugins.AdMob.destroyBannerView();
                                    }

                                    $scope.c.newSecret.show().then(function () {
                                        $scope.c.hideLoading()
                                        $scope.c.type = "..."
                                        $scope.img_progress = 0
                                        $scope.c.preview = "img/processing.gif"
                                        imageWorker.process(image, function (processed) {
                                                console.log("imageWorker: Success")
                                                $scope.c.progress = "Anylizing pixels..."
                                                $scope.c.explanation = "Submit full-screen secret with opened comments"
                                                $scope.$apply(function () {
                                                    $scope.c.preview = processed.preview

                                                }, true)
                                                $scope.c.avColor = processed.avaregeColor
                                                $scope.c.bgColor = -1
                                                $scope.c.pHash3 = processed.pHash3[1]
                                                $scope.c.pHash4 = processed.pHash4[1]
                                                $scope.c.pHash8 = processed.pHash8[1]
                                                $scope.c.pHash16 = processed.pHash16[1]
                                                $scope.$apply()
                                                var typeArr = []
                                                for (var typeIndex = 0; typeIndex < processed.type.length; typeIndex++) {
                                                    (function (typeIndex) {
                                                        customPlugins.ocr(processed.type[typeIndex], function (text) {
                                                            text = text.replace(/[^0-9A-Za-z:\(\)!?;.]/g, "")
                                                            console.log(text.replace(/(\r\n|\n|\r)/gm, "").replace(/[^\w\s]/gi, '') + ":"+ typeIndex)
                                                            typeArr.push(text.replace(/(\r\n|\n|\r)/gm, "").replace(/[^\w\s]/gi, ''))
                                                            if (typeArr.length == 5) {
                                                                proceedProcess()
                                                            }
                                                        }, function (err) {
                                                            typeArr.push("")
                                                            if (typeArr.length == 5) {
                                                                proceedProcess()
                                                            }
                                                        })
                                                    })(typeIndex)
                                                }

                                                var proceedProcess = function () {
                                                    var similarity = wordsCompare(typeArr)
                                                    console.log("Similarity:"+ JSON.stringify(similarity))

                                                    if (similarity["f"] < $scope.c.config.stringSimilarityThreshold * 1 && similarity["fof"] < $scope.c.config.stringSimilarityThreshold * 1) {
                                                        $scope.c.progress = "Secret is not valid"
                                                        $scope.c.explanation = 'Only <b>"Friend of friend"</b> and <b>"Friend"</b> secrets are accepted'
                                                        $scope.c.isSecretValid = -1
                                                        $scope.c.type = "unknown"
                                                        $scope.$apply()
                                                    }
                                                    else {
                                                        if (similarity["f"] >= similarity["fof"]) {
                                                            $scope.c.type = "friend"
                                                        }
                                                        else {
                                                            $scope.c.type = "friend of friend"
                                                        }
                                                        $scope.c.progress = "Reading minds..."
                                                        customPlugins.ocr(processed.post, function (text) {
                                                            text = text.replace(/[^0-9A-Za-z\., \-.]/g, "")
                                                            $scope.c.verification = text + $scope.c.avColor
                                                            var exists = $scope.c.userInfo.secrets.rows.filter(function (secret) {
                                                                return secret.Verification == $scope.c.verification
                                                            }).length
                                                            $scope.c.post = text
                                                            if (exists == 0) {
                                                                $scope.c.post = text
                                                                $scope.c.uploadSecret(function () {

                                                                    $scope.c.progress = "Ready!"
                                                                    $scope.c.explanation = "<h2 class='positive'>You've earned <b>"+ $scope.c.config.moneyForFriendSecret + "<i class='icon-right icon-ad-photo'></i></b></h2>"
                                                                    $scope.c.text = text
                                                                    $scope.c.isSecretValid = 1
                                                                    $scope.$apply()
                                                                    console.log(text)
                                                                })
                                                            }
                                                            else {
                                                                $scope.c.progress = "Secret already submitted!"
                                                                $scope.c.explanation = "Please select a new secret"
                                                                $scope.c.isSecretValid = -1
                                                                $scope.$apply()
                                                            }
                                                        }, function (err) {
                                                            console.log("imageWorker: Error "+ err)
                                                            $scope.c.progress = "Secret is not readable!"
                                                            $scope.c.explanation = "Please select valid secret screenshot"
                                                            $scope.c.isSecretValid = -1
                                                            $scope.c.type = "unknown"
                                                            $scope.$apply()
                                                        })
                                                        $scope.$apply()
                                                    }
                                                }
                                            }, function (err) {
                                                console.log("imageWorker: Error "+ err)
                                                $scope.c.progress = "Secret is not valid"
                                                $scope.c.explanation = "Screenshot should be taken from your phone"

                                                $scope.c.isSecretValid = -2
                                                $scope.c.type = "unknown"
                                                $scope.$apply()
                                            },
                                            function (progress) {
                                                console.log("Img progress:"+ progress)
                                                $scope.img_progress = progress
                                                $scope.$apply()
                                            })
                                    })
                                }, function (err) {
                                    console.log("getCaasdmeraImage: Error "+ err)
                                })

                            }
                        });

                        // For example's sake, hide the sheet after two seconds
                        $timeout(function () {
                            hideSheet();
                        }, 2000);
                    }
                };

                $scope.c.sendIssueConfirm = function () {

                    var confirmPopup = $ionicPopup.confirm({
                        title: 'How we can contact you?',
                        subTitle: 'Enter your contact email',
                        templateUrl: 'sendMail',
                        scope: $scope,
                        buttons: [
                            { text: 'Cancel' },
                            { type: 'button-positive', text: 'Send report', onTap: function (e) {
                                if (!$scope.c.email) {

                                    e.preventDefault();
                                } else {

                                    $scope.c.sendEmail()
                                    return $scope.c.email;
                                }
                            } }
                        ]
                    });
                }


                $scope.c.sendEmail =function()
                {
                    var body = "OS: "+profile.os()+"\n"+
                        "Screen: "+JSON.stringify(window.screen)+"\n"+
                        "OCR: "+ $scope.c.post+"\n"+
                        "Type: "+$scope.c.type+"\n"+
                        "Device: "+JSON.stringify(window.device)+"\n"+
                        "Failure: "+$scope.c.progress+""+$scope.c.explanation+"\n"

                    $scope.c.showLoading()
                    mainCommander.run({}, {
                            command: 'SEND_MAIL',
                            "fbToken": profile.fbToken(),
                            "fbID": profile.FacebookID(),
                            "body": body,
                            "email": $scope.c.email,
                            "image": $scope.c.preview.split(',')[1]
                        },
                        function (info) {
                            $scope.popover.hide()
                            $scope.c.hideLoading()
                           $scope.c.errorHandler()("mail_sent")

                        },
                        $scope.c.errorHandler($scope.c.sendEmail))
                }

                $scope.c.closeNewSecret = function () {

                    if (!!(1 * profile.showAds()) && !(1 * profile.wasInapp()) && DEBUG == 0) {
                        window.plugins.AdMob.createBannerView()
                    }


                    $scope.c.newSecret.hide()
                    $scope.c.clearUnusedData()

                }
                $scope.c.clearUnusedData = function () {
                    delete $scope.c.isSecretValid
                    delete $scope.c.progress
                    delete $scope.c.text
                    delete $scope.c.type
                    delete $scope.c.post
                    delete $scope.c.pHash3
                    delete $scope.c.pHash4
                    delete $scope.c.pHash8
                    delete $scope.c.pHash16
                    delete $scope.c.avColor
                    delete $scope.c.bgColor
                    $scope.c.preview = "img/processing.gif"
                }
                $scope.c.uploadSecret = function (success) {

                    $scope.c.showLoading()
                    mainCommander.run({}, {
                            command: 'UPLOAD_SECRET',
                            "isFriend": ($scope.c.type == "friend") ? 1 : 0,
                            "ocrString": $scope.c.post,
                            "pHash3": $scope.c.pHash3,
                            "pHash4": $scope.c.pHash4,
                            "pHash8": $scope.c.pHash8,
                            "pHash16": $scope.c.pHash16,
                            "avColor": $scope.c.avColor,
                            "bgColor": $scope.c.bgColor,
                            "fbToken": profile.fbToken(),
                            "fbID": profile.FacebookID(),
                            "extraInfo": ""},
                        function (info) {
                            console.log("Command UPLOAD_SECRET: success")
                            var newSecret = info.Secret
                            profile.updateBalance(info)
                            $scope.c.userInfo.money = info.Money
                            $scope.c.userInfo.diamonds = info.Diamonds
                            $scope.c.userInfo.FacebookID = info.FacebookID
                            var exist = $scope.c.userInfo.secrets.rows.filter(function (sec) {
                                return sec.SecretID == newSecret.SecretID
                            })
                            if (exist.length == 0) {
                                secretsStorage.addSecret(newSecret, $scope.c.verification, $scope.c.preview, function () {
                                    console.log("addSecret: success")
                                    newSecret.Verification = $scope.c.verification

                                    $scope.c.hideLoading()

                                    $scope.c.userInfo.secrets.rows.push(newSecret)
                                    $scope.c.userInfo.secrets.rows.sort(function (a, b) {
                                        return (a.SecretID * 1 > b.SecretID * 1) ? -1 : 1
                                    })
                                    console.log("New secret ready!")
                                    if (success)
                                        success()

                                }, function (error) {
                                    console.log("addSecret error: "+ JSON.stringify(error))
                                })
                            }
                            else {
                                $scope.c.errorHandler()("secret_exists")
                                secretsStorage.updateSecret(newSecret, function () {
                                    console.log("updateSecret: success")
                                    //$scope.c.newSecret.hide();
                                    $scope.c.hideLoading()
                                    //$scope.c.clearUnusedData()
                                    if (success)
                                        success()
                                    profile.getInfo(function (userInfo) {
                                        $scope.$apply(function () {
                                            $scope.c.userInfo = userInfo
                                        }, true)

                                    }, $scope.c.errorHandler())
                                }, function (error) {
                                    console.log("updateSecret error: "+ JSON.stringify(error))
                                })
                            }


                        },
                        $scope.c.errorHandler($scope.c.uploadSecret))

                }
                $ionicModal.fromTemplateUrl('newSecret.html', {scope: $scope,
                    animation: 'slide-in-up'}).then(function (modal) {
                        $scope.c.newSecret = modal;
                    });


                $scope.doRefresh = function () {
                    $scope.$broadcast('scroll.refreshComplete');

                    if ($scope.c.config == undefined) {
                        $scope.c.loadConfig()
                    }
                    else {
                        if (navigator.connection.type != "none") {
                            profile.getInfo(function (userInfo) {

                                $scope.$apply(function () {
                                    $scope.c.userInfo = userInfo
                                })

                            }, $scope.c.errorHandler($scope.doRefresh))
                        }
                        else {
                            $scope.c.errorHandler()("no_connection")
                        }
                    }
                    $scope.$apply()
                }
                $scope.openSecret = function (id) {
                    $location.path('/secret/' + id)
                }
            }]
        })
            .state('secret', {
                url: '/secret/:secretId',
                templateUrl: 'secret',
                controller: ["$scope", "mainCommander", "profile", "secretsStorage", "$location", "$stateParams", "customPlugins", "$ionicPopup",function ($scope, mainCommander, profile, secretsStorage, $location, $stateParams, customPlugins, $ionicPopup) {
                    $scope.confirmUnlock = function () {
                        var confirmPopup = $ionicPopup.confirm({
                            title: 'Unlock author of this secret?',
                            subTitle: 'Price',
                            template: '<h3 class="dark"style="width:120px; margin:auto;"><div style="float:left;">' + $scope.c.config.revealSecretMoneyPrice + '<i class="icon  icon-ad-photo"></i></div><div style="float:right;">' + $scope.c.config.revealSecretDiamondsPrice + '<i class="icon icon-ad-key3"></i></div></h3>'
                        });
                        confirmPopup.then(function (res) {
                            if (res) {
                                if ($scope.c.userInfo.money * 1 < $scope.c.config.revealSecretMoneyPrice * 1) {
                                    $scope.c.errorHandler()("not_enough_money")
                                }
                                else {
                                    if ($scope.c.userInfo.diamonds * 1 < $scope.c.config.revealSecretDiamondsPrice * 1) {
                                        $scope.c.buySecret()
                                    }
                                    else {
                                        $scope.c.revealSecret()
                                    }
                                }
                            } else {

                            }
                        });
                    };

                    $scope.c.revealSecret = function () {
                        $scope.c.showLoading()
                        mainCommander.run({}, {
                                command: 'REVEAL_SECRET',
                                "fbToken": profile.fbToken(),
                                "fbID": profile.FacebookID(),
                                "secretID": $scope.secret.SecretID
                            },
                            function (info) {

                                profile.updateBalance(info)
                                $scope.c.userInfo.money = info.Money
                                $scope.c.userInfo.diamonds = info.Diamonds
                                $scope.c.userInfo.FacebookID = info.FacebookID
                                $scope.secret.Status = info.Secret.Status
                                $scope.secret.RevealPhoneNumber = info.Secret.RevealPhoneNumber
                                $scope.secret.RevealFacebookID = info.Secret.RevealFacebookID

                                secretsStorage.updateSecret(info.Secret, function () {
                                    console.log("revealSecret: success")
                                    $scope.getSecret()
                                    profile.getInfo(function (userInfo) {
                                        $scope.$apply(function () {
                                            $scope.c.userInfo = userInfo
                                            $scope.c.hideLoading()
                                        }, true)

                                    }, $scope.c.errorHandler())

                                }, function (error) {
                                    console.log("revealSecret error: "+ JSON.stringify(error))
                                })


                            },
                            $scope.c.errorHandler($scope.c.uploadSecret))
                    }
                    $scope.getSecret = function () {
                        secretsStorage.getSecret($stateParams.secretId, function (result) {
                            $scope.secret = result.rows[0]
                            if ($scope.secret.RevealPhoneNumber != 0) {
                                secretsStorage.findContactName($scope.secret.RevealPhoneNumber, function (contactName) {
                                    $scope.secret.ContactName = contactName || "We have just phone number"
                                })
                            }

                            if (navigator.connection.type != "none"&& $scope.secret.RevealFacebookID != 0) {
                                profile.facebookName($scope.secret.RevealFacebookID, function (name) {
                                    $scope.secret.FacebookName = name
                                })
                            }
                            else {
                                $scope.secret.FacebookName = "[Internet needed]"
                            }
                            $scope.$apply()


                        })
                    }

                    $scope.inviteFriends = function () {
                        customPlugins.inviteFacebookFriends()
                    }

                    $scope.getSecret()
                }]
            })

        $urlRouterProvider.otherwise("/");
    }])
    .controller('TaskCtrl', ["$scope",function ($scope) {

    }])
    .controller("MainCtrl", ["$scope","mainCommander","configCommander","profile","secretsStorage","$ionicModal","$ionicLoading","commonPlugins","customPlugins","$ionicPopup","$ionicSlideBoxDelegate","inappManager","$ionicPopover","previewStorage",function ($scope, mainCommander, configCommander, profile, secretsStorage, $ionicModal, $ionicLoading, commonPlugins, customPlugins, $ionicPopup, $ionicSlideBoxDelegate, inappManager, $ionicPopover, previewStorage) {


        function initAd() {
            if (window.plugins && window.plugins.AdMob) {
                var ad_units = {
                    ios: {
                        banner: 'ca-app-pub-5146419390059918/8686086581',
                        interstitial: 'ca-app-pub-5146419390059918/1162819782'

                    },
                    android: {
                        banner: 'ca-app-pub-5146419390059918/4116286187',
                        interstitial: 'ca-app-pub-5146419390059918/5593019381'
                    }
                };
                var admobid = "";
                if (/(android)/i.test(navigator.userAgent)) {
                    admobid = ad_units.android;
                } else if (/(iphone|ipad)/i.test(navigator.userAgent)) {
                    admobid = ad_units.ios;
                }

                window.plugins.AdMob.setOptions({
                    publisherId: admobid.banner,
                    interstitialAdId: admobid.interstitial,
                    bannerAtTop: false, // set to true, to put banner at top
                    overlap: false, // set to true, to allow banner overlap webview
                    offsetTopBar: false, // set to true to avoid ios7 status bar overlap
                    isTesting: false, // receiving test ad
                    autoShow: true // auto show interstitial ad when loaded
                });

            } else {
                console.log('admob plugin not ready');
            }
        }


        $scope.c = {}
        $scope.c.configExpire = -1
        $ionicPopover.fromTemplateUrl('money_legend', {
            scope: $scope
        }).then(function (popover) {
                $scope.c.money_legend = popover;
            });

        $scope.c.openMoneyLegend = function ($event) {
            $scope.c.money_legend.show($event);
        };

        $ionicPopover.fromTemplateUrl('foxy_says', {
            scope: $scope
        }).then(function (popover) {

                $scope.c.foxy_phrase = popover;
            });

        $scope.c.foxy_says= function ($event) {

            var phrases = ["I know who loves you!", "Quite little foxy... Yes, it's me.", "One dollar helps me think faster",
                "Your friend published secret about you.", "Try harder! Submit more!", "Foxy foxes gather here!",
                "Somebody uploaded secret written by you.", "I'll help you to find out!", "I used to be a post man..",
                "Hmm...", "Stop touching me!", "It's all about secrets","He was your best friend...", "I'm from London!",
                "Yes, it's me","Sometimes we need to pay for the truth.", "I'm awesome!"]

                $scope.phrase = phrases[Math.floor(phrases.length*Math.random())]


            $scope.c.foxy_phrase.show($event);
        };


        $ionicPopover.fromTemplateUrl('diamonds_legend', {
            scope: $scope
        }).then(function (popover) {
                $scope.c.diamonds_legend = popover;
            });

        $scope.c.openDiamondsLegend = function ($event) {
            $scope.c.diamonds_legend.show($event);
        };


        $scope.c.inappBundles = []
        //<editor-fold  desc="Loading popup">
        $scope.c.showLoading = function () {
            $ionicLoading.show({
                template: '<i class="icon ion-loading-c"></i>'
            });
        };
        $scope.c.hideLoading = function () {
            $ionicLoading.hide();
        };
        //</editor-fold>
        $scope.c.errorHandler = function (retryAction, callback) {
            return function (error) {
                var title = "Error"
                var subTitle = "Something went wrong"
                var template = (error && error.data) ? error.data.message : "Application error"
                var okText = "Retry"
                var okType = "button-assertive"
                var flurry_error_name = "unknown_error"
                var eventType = "error"
                if (error) {
                    if (error == "error_settings"|| error == "error") {
                        subTitle = "No access to Facebook profile"
                        template = "Go to settings and allow the app access your info"
                        okText = "OK"
                        flurry_error_name = subTitle
                    }
                    else if (error == "error_no_text") {
                        subTitle = "Failed analyze image"
                        template = "It's a bad secret please use different screenshot"
                        okText = "OK"
                        flurry_error_name = "No ocr text"
                    }
                    else if (error == "secret_exists") {
                        title = "Done"
                        subTitle = ""
                        template = "This secret already exists"
                        okText = "OK"
                        okType = "button-balanced"
                        flurry_error_name = "Secret exists"
                    }
                    else if (error == "contacts_disabled"|| error.code == 20) {
                        title = "Enable contacts"
                        subTitle = "Failed to import contacts"
                        template = "Go to settings and allow the app access your contacts"
                        okText = "OK"
                        okType = "button-assertive"
                        flurry_error_name = "Contact disabled"

                    }

                    else if (error == "in_app_success") {
                        title = "Balance updated"
                        subTitle = "You just made in-app purchase"
                        template = ("<h3>Now you have "+ profile.diamonds() + "<i class='icon icon-ad-key3'></i></h2>")
                        okText = "OK"
                        okType = "button-calm"
                        flurry_error_name = "Inapp success"
                        eventType = "success"
                        $scope.c.userInfo.diamonds = profile.diamonds()
                        $scope.c.userInfo.money = profile.money()
                    }

                    else if (error == "no_connection") {
                        title = "No internet"
                        subTitle = "Please check your internet connectivity"
                        template = "Application works in read-only mode."
                        okText = "OK"
                        okType = "button-dark"
                        flurry_error_name = "No internet connection"

                    }
                    else if (error == "no_inapps") {
                        title = "Cannot connect ot "+ (($scope.c.os == "ios") ? "Appstore": "Google play")
                        subTitle = "Check your internet connectivity"
                        template = "Please restart the application"
                        okText = "OK"
                        okType = "button-dark"

                        flurry_error_name = title

                        retryAction = function () {
                            inappManager.register($scope.c.config.bundles[profile.os()])
                        }
                    }

                    else if (error == "problematic") {
                        title = "Something went wrong"
                        subTitle = ""
                        template = "We are unable to solve this tough secret. Sorry :("
                        okText = "OK"
                        okType = "button-dark"
                        flurry_error_name = "Click on problematic help"
                        eventType = "info"

                    } else if (error == "not_enough_money") {
                        title = "Not enough secrets"
                        subTitle = ""
                        template = "Earn "+ $scope.c.config.moneyForFriendSecret + "<i class='icon icon-ad-photo'></i> for a submited secret!"
                        okText = "OK"
                        okType = "button-dark"
                        flurry_error_name = "Not enough money"
                        eventType = "info"
                    }
                    else if (error == "mail_sent") {
                        title = "Mail sent to secret agents"
                        subTitle = "Investigation has begun!"
                        template = "Thank you for your help!"
                        okText = "OK"
                        okType = "button-positive"
                        flurry_error_name = "Issue email sent"
                        eventType = "info"
                    }
                    else if (error == "inapp_not_valid"|| (error.data && error.data.errorCode == "9")) {
                        title = "Purchase failed"
                        subTitle = "Please try again later"
                        template = "Your balance has not been updated"
                        okText = "OK"
                        okType = "button-assertive"
                        flurry_error_name = title


                    }
                    else if (error.data) {
                        /*define('UNEXPECTED_BEHAVIOR', 1);
                         define('UNEXPECTED_INPUT', 2);
                         define('UNEXPECTED_DAL_BEHAVIOR', 3);
                         define('WRONG_INPUT_COMMAND_MISSING', 4);
                         define('WRONG_INPUT_UNSUPPORTED_COMMAND', 5);
                         define('WRONG_INPUT_TOO_MANY_ARGS', 6);
                         define('WRONG_INPUT_MANDATORY_ARGUMENT_MISSING', 7);
                         define('INTERNAL_ERROR', 8);
                         define('IN_APP_FAILURE', 9);
                         define('BAD_FB_TOKEN', 10);
                         define('CONTACTS_ERROR', 11); // TODO: what to do with this?
                         define('BAD_DEVICE_TOKEN', 12); // TODO: what to do with this?
                         define('UNKNOWN_OS', 13);
                         define('NON_REGISTERED_USER', 14);*/
                        flurry_error_name = "ERR:"+ error.data.errorCode
                        switch (error.data.errorCode) {
                            case "1":
                            case "2":
                            case "3":
                            case "4":
                            case "5":
                            case "6":
                            case "7":
                            case "8":
                            case "9":
                            case "11":
                                title = "Application error"
                                subTitle = "Please try again later"
                                template = "Don't tell anybody..."
                                okText = "OK"
                                okType = "button-assertive"
                                break
                            case "12":
                                $scope.c.showLoading()
                                customPlugins.getDeviceToken(function (token) {
                                    $scope.c.hideLoading()
                                    if (token) {
                                        $scope.c.intro.os = token.OS
                                        profile.deviceToken(token.GUID)
                                        profile.os(token.OS)
                                        $scope.$apply()
                                        if (retryAction)
                                            retryAction(callback)
                                    }
                                }, $scope.c.errorHandler(retryAction, callback))
                                return
                            case "10":
                                customPlugins.getFacebookToken(function (token) {
                                    $scope.c.hideLoading()
                                    if (token) {

                                        profile.fbToken(token)
                                        $scope.$apply()
                                        if (retryAction)
                                            retryAction(callback)

                                    }
                                }, $scope.c.errorHandler(retryAction, callback))
                                return
                                break
                            case "14":
                                title = "There is no such user"
                                subTitle = ""
                                template = "Please proceed to registration"
                                okText = "OK"
                                okType = "button-assertive"
                                profile.contacts(0)
                                profile.deviceToken(0)
                                profile.fbToken(0)
                                profile.FacebookID(0)
                                profile.os(0)
                                profile.registered(0)

                                $scope.c.userInfo.secrets.rows.map(function (secret) {
                                    previewStorage.deletePreview(secret.secretID)
                                })

                                secretsStorage.clearSecrets(function () {
                                }, $scope.c.errorHandler())
                                $scope.startRegistration()
                                retryAction = undefined
                                break
                            case "1001":
                                title = "Version not supported"
                                subTitle = ""
                                template = error.data.message
                                okText = "OK"
                                okType = "button-assertive"
                                break;
                            case "1002":
                                title = "Maintenance"
                                subTitle = ""
                                template = error.data.message
                                okText = "OK"
                                okType = "button-assertive"
                                break;

                            default:
                                title = "Error"
                                template = JSON.stringify(error)
                                okText = "OK"
                                okType = "button-assertive"
                                break

                        }
                    }
                }

                var params = {id: profile.FacebookID(), description: flurry_error_name}
                if (DEBUG != 1) {
                    window.plugins.flurry.logEventWithParameters(eventType, params, function () {
                        console.log("Flurry event:"+ flurry_error_name + "["+ flurry_error_name + "]")
                    }, function () {
                        console.error(flurry_error_name)
                    })
                }

                $scope.c.hideLoading()
                var alertPopup = $ionicPopup.alert({
                    title: title,
                    subTitle: subTitle,
                    template: template,
                    okText: okText,
                    okType: okType
                });
                alertPopup.then(function (res) {
                    if (retryAction)
                        retryAction(callback)
                });
            }
        }


        $scope.c.help=function()
        {

            $ionicModal.fromTemplateUrl('help', {
                scope: $scope,
                animation: 'slide-in-down',
                backdropClickToClose: true
            }).then(function (modal) {
                    $scope.c.helpModal=modal
                    $scope.c.helpModal.show()
                    $scope.c.helpSlide=0
                    $scope.c.numHelpOfSlides = $ionicSlideBoxDelegate

                })
        }
        $scope.c.helpClose= function()
        {
            $scope.c.helpModal.hide()
        }
        $scope.c.helpNext=function()
        {
            $scope.c.helpSlide++
        }

        $scope.c.helpPrev=function()
        {
            $scope.c.helpSlide--
        }

        $scope.c.buySecret = function () {
            $scope.c.showLoading()
            if ($scope.c.inappBundles.length > 0) {

                inappManager.buyUnsecret($scope.c.inappBundles[0].id, $scope.c.errorHandler(), $scope.c.errorHandler())
            }
            else {

                inappManager.getPrices(function (prices) {
                    $scope.c.inappBundles = prices
                    console.log("recieved prices:"+ JSON.stringify(prices))
                    inappManager.buyUnsecret($scope.c.inappBundles[0].id, $scope.c.errorHandler(), $scope.c.errorHandler())
                })
            }
        }

        $scope.c.loadConfig = function () {


            if (((new Date() - $scope.c.configExpire) / 1000) < 5 && $scope.c.configExpire != -1) {
                console.log("Config not expired yet")
                return;
            }


            console.log("loadConfig: Init")
            $scope.c.showLoading()
            if (navigator.connection.type == "none") {
                $scope.c.errorHandler()("no_connection")
                profile.getInfo(function (userInfo) {
                    console.log("userInfo")
                    $scope.$apply(function () {
                        $scope.c.userInfo = userInfo
                        $scope.c.hideLoading()
                    }, true)
                })
            }
            else {
                $scope.c.config = configCommander.get({}, {},
                    function (response) {
                        profile.showAds(response.showAds)
                        $scope.c.configExpire = new Date()
                        $scope.c.config = response
                        inappManager.setCallbacks($scope.c.errorHandler(), $scope.c.errorHandler(), function (prices) {
                            $scope.c.inappBundles = prices
                        })
                        inappManager.register($scope.c.config.bundles[profile.os()])
                        console.log("Command GET_GENERAL_CONFIG: success")
                        $scope.c.hideLoading()
                        if (profile.registered() == false && (profile.contacts() != false && profile.deviceToken() != false && profile.os() != false && profile.fbToken() != false)) {
                            console.log("register")

                            $scope.register()
                        }
                        else if (profile.contacts() == false || profile.deviceToken() == false || profile.os() == false || profile.fbToken() == false) {
                            console.log("startRegistration")
                            if (!$scope.c.intro) {


                                if ($scope.c.userInfo) {
                                    $scope.c.userInfo.secrets.rows.map(function (secret) {
                                        previewStorage.deletePreview(secret.secretID)
                                    })
                                }


                                secretsStorage.clearSecrets(function () {
                                }, $scope.c.errorHandler())

                                $scope.startRegistration()
                            }
                            else {
                                $scope.c.intro.show()
                            }

                        }

                        else {
                            if (!!(1 * profile.showAds()) && !(1 * profile.wasInapp()) && DEBUG == 0) {
                                window.plugins.AdMob.createBannerView();
                            }
                            console.log("GET FULL DATA")
                            $scope.c.showLoading()
                            profile.getInfo(function (userInfo) {

                                $scope.$apply(function () {
                                    $scope.c.userInfo = userInfo
                                    $scope.c.hideLoading()
                                }, true)
                            }, $scope.c.errorHandler())
                        }
                    }, $scope.c.errorHandler($scope.c.loadConfig))
            }

        }

        if (!DEBUG) {

            document.addEventListener("deviceready", function () {
                $scope.c.loadConfig()
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
                    $scope.c.rootURI = fileSystem.root.nativeURL

                    document.addEventListener("resume", function () {
                        if (profile.os() == "android") {
                            window.plugins.flurry.startSession(profile.flurryId(), function () {
                                console.log("Flurry session start success")
                            }, function () {
                                console.log("Flurry session start failure")
                            })
                        }
                    }, false);

                    document.addEventListener("pause", function () {
                        if (profile.os() == "android") {
                            window.plugins.flurry.endSession( function () {
                                console.log("Flurry session end success")
                            }, function () {
                                console.log("Flurry session end failure")
                            })
                        }
                    }, false);

                    document.addEventListener("online", $scope.c.loadConfig, false);


                    window.plugins.flurry.startSession(profile.flurryId(), function () {
                        console.log("Flurry registered successfully")
                    }, function () {
                        console.log("Flurry error")
                    })

                    if (profile.os() == "ios") {
                        window.plugins.flurry.setSessionReportsOnCloseEnabled(true, function () {
                            console.log("Flurry setSessionReportsOnCloseEnabled success")
                        }, function () {
                            console.log("Flurry setSessionReportsOnCloseEnabled failure")
                        })
                        window.plugins.flurry.setSessionReportsOnPauseEnabled(true, function () {
                            console.log("Flurry setSessionReportsOnPauseEnabled success")
                        }, function () {
                            console.log("Flurry setSessionReportsOnPauseEnabled failure")
                        })
                    }

                    initAd()
                });
            })
        }
        else {
            navigator.connection = {type: "wifi"}
            $scope.c.loadConfig()
            $scope.c.rootURI = "img/"
        }


        //<editor-fold  desc="Registration modal">
        $scope.phoneNumberPattern = (function () {
            var regexp = /^\+?[ .-\d()]+$/;
            return {
                test: function (value) {
                    if ($scope.c.intro.phoneNumber === false) return true;
                    else return regexp.test(value);
                }
            };
        })();

        $scope.startRegistration = function (callBack) {


            if (!!(1 * profile.showAds()) && !(1 * profile.wasInapp()) && DEBUG == 0) {
                window.plugins.AdMob.destroyBannerView();
            }


            if ($scope.c.intro) {
                $scope.c.intro.contacts = 0
                $scope.c.intro.deviceToken = 0
                $scope.c.intro.facebookToken = 0
                $scope.c.intro.os = 0
                $scope.c.intro.active_slide = 0
                $scope.c.intro.show()
            }
            else {


                $ionicModal.fromTemplateUrl('intro', {
                    scope: $scope,
                    animation: 'slide-in-up',
                    backdropClickToClose: false
                }).then(function (modal) {
                        $ionicSlideBoxDelegate.enableSlide(true);
                        $scope.c.intro = modal;
                        $scope.c.intro.importContacts = function () {
                            if (profile.contacts() != false)
                                return
                            //Plugin init
                            $scope.c.showLoading()
                            commonPlugins.getContacts("", function (contacts) {
                                $scope.c.hideLoading()
                                if (contacts.length > 0) {
                                    var seperate_contacts = []
                                    console.log(contacts.length + "imported")
                                    for (var i = 0; i < contacts.length; i++) {

                                        if (contacts[i].phoneNumbers != undefined)
                                            for (var j = 0; j < contacts[i].phoneNumbers.length; j++) {
                                                if (contacts[i].name.formatted != undefined && contacts[i].phoneNumbers[j].value != undefined)
                                                    seperate_contacts.push({name: contacts[i].name.formatted, phone: contacts[i].phoneNumbers[j].value})
                                            }
                                    }
                                    secretsStorage.setContacts($scope.c.intro.phoneNumber, seperate_contacts, function () {
                                        $scope.c.intro.contacts = true
                                        $scope.$apply()

                                        profile.contacts(true)
                                        $scope.c.intro.getDeviceToken(function () {
                                            $scope.register()
                                        })

                                    }, function (err) {
                                        console.log(seperate_contacts)
                                        console.log(err)
                                    })
                                }
                                else {
                                    $scope.c.errorHandler()("contacts_disabled")
                                }
                            }, $scope.c.errorHandler())
                        }
                        $scope.c.intro.getDeviceToken = function (success, error) {

                            //Plugin init
                            $scope.c.showLoading()
                            customPlugins.getDeviceToken(function (token) {
                                $scope.c.hideLoading()
                                if (token) {
                                    $scope.c.intro.deviceToken = token.GUID
                                    $scope.c.intro.os = token.OS
                                    profile.deviceToken(token.GUID)
                                    profile.os(token.OS)
                                    $scope.$apply()
                                    if (success)
                                        success(token)
                                }
                            }, error)
                        }
                        $scope.c.intro.getFacebook = function () {
                            if (profile.fbToken() != false)
                                return
                            //Plugin init
                            $scope.c.showLoading()
                            customPlugins.getFacebookToken(function (token) {
                                $scope.c.hideLoading()
                                if (token) {
                                    $scope.c.intro.facebookToken = token
                                    profile.fbToken(token)
                                    $scope.$apply()
                                    $scope.register()
                                }
                            }, $scope.c.errorHandler())
                        }


                        $scope.c.intro.next = function () {
                            $scope.c.intro.active_slide++
                        }
                        $scope.c.intro.prev = function () {
                            $scope.c.intro.active_slide--
                        }

                        $scope.$watch("c.intro.active_slide",function()
                        {
                          if($scope.c.intro.active_slide==3)
                          {
                              $ionicSlideBoxDelegate.enableSlide(false);
                          }
                        })

                        $scope.c.intro.done = function () {
                            $scope.c.intro.hide()
                        }

                        $scope.c.intro.show().then(function () {
                            $scope.c.intro.contacts = profile.contacts()
                            $scope.c.intro.deviceToken = profile.deviceToken()
                            $scope.c.intro.facebookToken = profile.fbToken()
                            $scope.c.intro.phoneNumber = profile.myPhoneNumber()
                            $scope.c.intro.os = profile.os()

                            if (profile.contacts() == false && profile.deviceToken() == false)
                                $scope.c.intro.active_slide = 0
                            else if (profile.contacts() == false || profile.deviceToken() == false)
                                $scope.c.intro.active_slide = 4
                            else if (profile.contacts() != false && profile.deviceToken() != false)
                                $scope.c.intro.active_slide = 5
                            else
                                $scope.c.intro.active_slide = 0

                            if (callBack != undefined)
                                callBack()
                        })
                    });
            }
        }


        $scope.register = function () {
            if (profile.contacts() == false || profile.deviceToken() == false || profile.os() == false || profile.fbToken() == false)
                return

            $scope.c.showLoading()

            secretsStorage.getContacts(function (contacts) {
                console.log("getContacts")

                var contactsarr = contacts.rows.map(function (contact) {
                    return contact.phone
                })

                mainCommander.run({}, {
                        command: 'REGISTER',
                        'myPhoneNumber': profile.myPhoneNumber(),
                        "device": profile.os(),
                        "phoneNumbers": contactsarr.join("|"),
                        "fbToken": profile.fbToken()},
                    function (response) {
                        $scope.registerSuccess(response);
                    },
                    $scope.c.validateRegistration)
            })
        }


        $scope.registerSuccess = function (response) {
            $scope.c.hideLoading()
            console.log("Register success")

            if ($scope.c.intro != undefined) {
                $scope.c.intro.remove();


            }


            profile.FacebookID(response.FacebookID)
            profile.registered(true)
            $scope.c.userInfo = {}
            $scope.c.userInfo.secrets = {}
            $scope.c.userInfo.secrets.rows = []

            $scope.c.loadConfig()
        }

        $scope.c.validateRegistration = function (error) {

            var displayError = function () {
                $scope.c.hideLoading()
                var title = "Error"
                var subTitle = "Error"
                var okText = "OK"
                var message = "Something went wrong"

                switch (error.data.errorCode) {

                    case "10":
                        title = "Facebook import"
                        subTitle = "Connection with facebook failed"
                        message = "Please grant access to Facebook in order to proceed"
                        okText = "Try again"
                        profile.fbToken(0)
                        break;
                    case "11":
                        title = "Contacts import"
                        subTitle = "Can't import contact"
                        message = "Please grant access to your contacts in order to proceed"
                        okText = "Try again"
                        profile.contacts(0)
                        break;
                    case "12":
                        title = "Push notifications error"
                        subTitle = ""
                        message = "Please allow push notification for this app"
                        okText = "Try again"
                        profile.deviceToken(0)
                        profile.contacts(0)
                        break;
                    case "13":
                        title = "Unknown device type"
                        subTitle = "We support only IOS and Android"
                        message = "Not available on your device"
                        okText = "OK"
                        profile.contacts(0)
                        profile.deviceToken(0)
                        profile.os(0)
                        break;
                    case "8":
                        title = "Unknown device type"
                        subTitle = "We support only IOS and Android"
                        message = "Not available on your device"
                        okText = "OK"
                        profile.contacts(0)
                        profile.deviceToken(0)
                        profile.os(0)
                        break;
                    case "4":
                    default:
                        profile.contacts(0)
                        profile.deviceToken(0)
                        profile.fbToken(0)
                        profile.os(0)
                        break;
                }
                $scope.c.intro.contacts = profile.contacts()
                $scope.c.intro.deviceToken = profile.deviceToken()
                $scope.c.intro.facebookToken = profile.fbToken()
                $scope.c.intro.os = profile.os()

                if (profile.contacts() == false && profile.deviceToken() == false)
                    $scope.c.intro.active_slide = 0
                else if (profile.contacts() == false || profile.deviceToken() == false)
                    $scope.c.intro.active_slide = 4
                else if (profile.contacts() != false && profile.deviceToken() != false)
                    $scope.c.intro.active_slide = 5
                else
                    $scope.c.intro.active_slide = 0
                var alertPopup = $ionicPopup.alert({
                    title: title,
                    subTitle: subTitle,
                    template: message,
                    okText: okText,
                    okType: 'button-assertive'
                });
                alertPopup.then(function (res) {
                });
            }
            if ($scope.c.info == undefined)
                $scope.startRegistration(displayError);
            else
                displayError()
        }


        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
            $scope.c.intro.remove();
        });
        // Execute action on hide modal
        $scope.$on('intro.hidden', function () {
            $scope.modal.remove();
        });
        // Execute action on remove modal
        $scope.$on('intro.removed', function () {
            $scope.modal.remove();
        });
        // </editor-fold>


    }
    ])
    .
    run(["$ionicPlatform",function ($ionicPlatform) {
        $ionicPlatform.ready(function () {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }
            /*if (window.StatusBar) {
             StatusBar.styleDefault();
             }*/
        });
    }])
