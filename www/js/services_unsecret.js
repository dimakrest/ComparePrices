'use strict';
angular.module('unsecret.services', ['ngResource'])
    .value('app_version',function()
    {
        return "1"
    })
    .value('server', {
        endpoint:"no_server",
        set: function (endpoint) {
            this.endpoint = endpoint;
        },
        get: function()
        {
            return this.endpoint
        }})
    .factory('configCommander', ['$resource', 'server',"app_version",function ($resource, server,app_version) {

        return $resource('http://unsecret.s3.amazonaws.com/config.json', {}, {
            get: {
                method: 'GET',
                isArray: false,
                transformResponse: function (data) {
                    var response = JSON.parse(data)
                    if(response.requiredAppVersion!=app_version())
                    {
                        throw {"data":{"message":"Please update the application", errorCode:"1001"}}
                    }
                    else if(response.maintenanceMessage!="")
                    {
                        throw {"data":{"message":response.maintenanceMessage, errorCode:"1002"}}
                    }

                    server.set(JSON.parse(data).server)
                    return JSON.parse(data);
                }
            }
        })
    }])
    .factory('mainCommander', ['$resource', 'server',function ($resource, server) {

        return {
            run: function(unused, params, success, error)
            {
                if(server.endpoint == "no_server")
                {
                    error({message:"No server available", errorCode:1})
                }
                else
                {
                    return $resource(server.endpoint,{method:'POST', isArray:false}).save(params, success,error);
                }
            }
        }


    }])
    //<editor-fold  desc="secretsStorage">
    .factory('previewStorage', function () {

        function decodeBase64Image(dataString) {

            var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)

            if (matches.length !== 3) {
                return new Error('Invalid input string');
            }


            var byteCharacters = atob(matches[2]);
            var byteNumbers = new Array(byteCharacters.length);
            for (var i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            var byteArray = new Uint8Array(byteNumbers);
            var BINARY_ARR = byteArray.buffer;


            return BINARY_ARR;
        }

        return {

            setPreview: function (secretID, imageData, success, error) {
                console.log("setPreview: Init")

                if (!DEBUG) {
                    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
                        console.log("setPreview: Got filesystem")
                        fileSystem.root.getFile("secretID_" + secretID + ".jpg", {create: true, exclusive: false}, function (fileEntry) {
                            console.log("setPreview: Got fileEntry")
                            var fileURI = "secretID_" + secretID + ".jpg"
                            fileEntry.createWriter(function (writer) {
                                console.log("setPreview: Writer created")
                                writer.onwriteend = function (evt) {

                                    if (success != undefined) {
                                        console.log("setPreview: Image saved " + fileURI)
                                        success(fileURI)
                                    }
                                }
                                writer.write(decodeBase64Image(imageData));

                            }, error)
                        }, error);
                    }, error);
                }
                else {
                    success("noImage.jpg")
                }

            },
            deletePreview: function (secretID) {
                if (!DEBUG) {
                    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
                        console.log("setPreview: Got filesystem")
                        fileSystem.root.getFile("secretID_" + secretID + ".jpg", {create: false, exclusive: false}, function (fileEntry) {
                            console.log("deletePreview: Got fileEntry")
                            var fileURI = "secretID_" + secretID + ".jpg"
                            fileEntry.remove(function(){
                                console.log(fileURI+" delete successfully")
                            },function(){
                                console.log(fileURI+" delete error")
                            })
                        });
                    });
                }
            }

        }
    })
    //</editor-fold>

    //<editor-fold  desc="commonPlugins">
    .factory('commonPlugins', function () {
        return {

            getContacts: function (filter, success, error) {
                console.log("getContacts: Init")
                if (!DEBUG) {
                    var options = new ContactFindOptions();
                    options.filter = filter;
                    options.multiple = true;
                    var fields = ["phoneNumbers", "name"];
                    navigator.contacts.find(fields, success, error, options);
                }
                else {
                    setTimeout(function () {
                        var contacts = []
                        contacts.push({name: {formatted: "Karen"}, phoneNumbers: [
                            {value: "123123123"},
                            {value: "33223322"}
                        ]})
                        contacts.push({name: {formatted: "Dima"}, phoneNumbers: [
                            {value: "12233123123"},
                            {value: "3323223322"}
                        ]})
                        success(contacts)
                    }, 500)
                }
            },
            getCameraImage: function (success, error) {
                console.log("getCameraImage: Init")
                if (!DEBUG) {
                    navigator.camera.getPicture(success, error, { quality: 100,
                        destinationType: navigator.camera.DestinationType.FILE_URI,
                        sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY, encodingType: Camera.EncodingType.PNG})
                }
                else {
                    var image = "C:/WebServers/home/localhost/www/Unsecret/ref/ilia_io8/Photo 11-10-14, 22 20 46.png"
                    setTimeout(function () {
                        success(image)
                    }, 500)
                }
            }
        }
    })
    //</editor-fold>

    //<editor-fold  desc="customPlugins">
    .factory('customPlugins', function () {
        return {
            inviteFacebookFriends: function (success, error) {

                if (!DEBUG) {
                    cordova.exec(success, error, "UnsecretNative", "InviteFacebookFriends", []);
                }
                else {

                }
            },
            getFacebookToken: function (success, error) {
                console.log("getFacebookToken: Init")
                if (!DEBUG) {
                    cordova.exec(success, error, "UnsecretNative", "connectWithFacebook", []);
                }
                else {
                    setTimeout(function () {
                        success("CAADjQGDTHFgBANkQ5V6EzUlZAZAz6niSCjmFgMIYjjY1WZC0OEfbjYXk3AoZCm2iighTmlujL1QE2t3NrzLnCOCu2CbpAqgZCjZCo9qiVYzBfCZCRqRkr0FbRgaXrUyLWqIbn2DEssEXW8RPWz5Rc6iUWPAe7XQg4YkMgcZCpSF1s56SmRYLhOlMFSum6ZCrr42y9hMLFewI7vyYDEPC4lOqShxaWJ8c0TbQczVvpb1v3aAZDZD");
                    }, 500)
                }
            },
            getDeviceToken: function (success, error) {

                console.log("getDeviceToken: Init")
                if (!DEBUG) {
                    cordova.exec(success, error, "UnsecretNative", "Device", []);
                }
                else {
                    setTimeout(function () {
                        success({"GUID": "F70A38CC-6F84-4AD9-AFCC-A543EE0BD094", "OS": "ios"});
                    }, 500)
                }
            },
            ocr: function (image, success, error) {
                console.log("ocr: Init")
                var matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
                if (!DEBUG) {
                    cordova.exec(success, error, "UnsecretNative", "OCR", [matches[2]]);
                }
                else {
                    var responses = ["Friend of riend", "friewd od fnend", "fnenb ot tnenb", "frlerib ob friend", "friend ot trierib"]
                    //var responses = ["www"]
                    setTimeout(function () {
                        success(responses[Math.floor(Math.random() * responses.length)])
                    }, 500)
                }
            }
        }
    })
//</editor-fold>

//<editor-fold  desc="secretsStorage">
    .factory('secretsStorage', ["previewStorage",function (previewStorage) {

        var secretTbCreateQuery = 'CREATE TABLE IF NOT EXISTS tbSecrets (SecretID, Verification, Status, RevealPercentage, RevealFacebookID, PeopleAddedSecret,RevealPhoneNumber ,NumOfSuspects , PeopleNeededMoreToSolve)'

        function convertPhoneNumber(origPhoneNumber) {

            var countryCodeToTrunkCodes = {"1": "1", "20": "0", "211": "-", "212": "0", "213": "0", "216": "-", "218": "0", "220": "-", "221": "-", "222": "-", "223": "-", "224": "-", "225": "-", "226": "-", "227": "-", "228": "-", "229": "-", "230": "-", "231": "-", "232": "0", "233": "0", "234": "0", "235": "-", "236": "-", "237": "-", "238": "-", "239": "-", "240": "-", "241": "-", "242": "-", "243": "0", "244": "-", "245": "-", "246": "-", "247": "-", "248": "-", "249": "0", "250": "-", "251": "0", "252": "-", "253": "-", "254": "0", "255": "0", "256": "0", "257": "-", "258": "-", "260": "0", "261": "0", "262": "-", "264": "0", "265": "-", "266": "-", "267": "-", "268": "-", "269": "-", "27": "0", "290": "-", "291": "0", "297": "-", "298": "-", "299": "-", "30": "-", "31": "0", "32": "0", "33": "0", "34": "-", "350": "-", "351": "-", "352": "-", "353": "0", "354": "-", "355": "0", "356": "-", "357": "-", "358": "0", "359": "0", "36": "06", "370": "8", "371": "-", "372": "-", "373": "0", "374": "0", "375": "80", "376": "-", "377": "-", "378": "-", "379": "-", "380": "0", "381": "0", "382": "0", "385": "0", "386": "0", "387": "0", "389": "0", "39": "-", "40": "0", "41": "0", "420": "-", "421": "0", "423": "-", "43": "0", "44": "0", "45": "-", "46": "0", "47": "-", "48": "-", "49": "0", "500": "-", "501": "-", "502": "-", "503": "-", "504": "-", "505": "-", "506": "-", "507": "-", "508": "-", "509": "-", "51": "0", "52": "01", "53": "0", "54": "0", "55": "0", "56": "0", "57": "0", "58": "0", "590": "0", "591": "0", "592": "-", "593": "0", "594": "0", "595": "0", "596": "0", "597": "0", "598": "0", "599": "0", "60": "0", "61": "0", "62": "0", "63": "0", "64": "0", "65": "-", "66": "0", "670": "-", "6723": "-", "673": "-", "674": "-", "675": "-", "676": "-", "677": "-", "678": "-", "679": "-", "680": "-", "681": "-", "682": "-", "683": "-", "685": "-", "686": "-", "687": "-", "688": "-", "689": "-", "690": "-", "691": "1", "692": "1", "7": "8", "81": "0", "82": "0", "84": "0", "850": "-", "852": "-", "853": "-", "855": "0", "856": "0", "86": "0", "870": "-", "880": "0", "8816": "-", "882": "-", "886": "0", "90": "0", "91": "0", "92": "0", "93": "0", "94": "0", "95": "0", "960": "-", "961": "0", "962": "0", "963": "0", "964": "-", "965": "-", "966": "0", "967": "0", "968": "-", "970": "0", "971": "0", "972": "0", "973": "-", "974": "-", "975": "-", "976": "0", "977": "0", "98": "0", "992": "8", "993": "8", "994": "0", "995": "0", "996": "0", "998": "8", "263": "0"};


            var convertedPhoneNumber = "";
            if (origPhoneNumber.trim()[0] == "+")
                convertedPhoneNumber = "+" + origPhoneNumber.replace(/[^0-9.]/g, "");
            else
                convertedPhoneNumber = origPhoneNumber.replace(/[^0-9.]/g, "");
            // first step is to replace first 00 with +
            convertedPhoneNumber = convertedPhoneNumber.replace(/^00/, "+");
            // phone number contains country code
            if (convertedPhoneNumber[0] == "+") {
                var countryCode = "";
                for (var i = 1; i < convertedPhoneNumber.length; i++) {
                    countryCode = countryCode.concat(convertedPhoneNumber[i]);
                    if (countryCode in countryCodeToTrunkCodes) {
                        if (countryCodeToTrunkCodes[countryCode] != "-") {
                            convertedPhoneNumber = countryCodeToTrunkCodes[countryCode] + convertedPhoneNumber.substr(i + 1);
                        }
                        else {
                            convertedPhoneNumber = convertedPhoneNumber.substr(i + 1);
                        }
                        break;
                    }
                }
            }

            return convertedPhoneNumber;
        }


        function logError(errorCallBack) {
            return function (err) {
                console.log("DB error: " + err.code)
                if (errorCallBack)
                    errorCallBack(err)
            }

        }


        function populateDB(tx) {
            //tx.executeSql('DROP TABLE IF EXISTS tbSecrets')
            //console.log("DROP DB")
            tx.executeSql(secretTbCreateQuery)
        }

        function errorCB(err) {
            console.log("Error processing SQL: " + err.code);
        }

        function successCB() {
            console.log("Db connection success!");
        }

        var db = window.openDatabase("UnSecretDB", "1.0", "Global storage", 1000000);
        db.transaction(populateDB, errorCB, successCB);

        return {
            getAllSecrets: function (success, error) {
                console.log("getAllSecrets: Init")
                var response = {}
                response.rows = []
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM tbSecrets', [], function (tx, rawresults) {
                        var len = rawresults.rows.length;
                        console.log("getAllSecrets: " + len + " rows found.");
                        for (var i = 0; i < len; i++) {
                            response.rows.push(rawresults.rows.item(i));
                        }
                        response.rows.sort(function (a, b) {
                            return (a.SecretID * 1 > b.SecretID * 1) ? -1 : 1
                        })
                        if (success)
                            success(response)

                    }, logError(error));
                }, logError(error));
                return response

            },
            getSecret: function (secretId, success, error) {
                console.log("getSecret: Init")
                var response = {}
                response.rows = []
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM tbSecrets WHERE SecretID=' + secretId, [], function (tx, rawresults) {
                        var len = rawresults.rows.length;
                        if (len > 0) {
                            response.rows.push(rawresults.rows.item(0));
                            if (success)
                                success(response)
                        }
                        else {
                            console.log("No secret :" + secretId)
                            if (error)
                                error("no_such_secret")
                        }


                    }, logError(error));
                }, logError(error));
                return response
            },
            clearSecrets: function (success, error) {
                console.log("clearSecret: Init")
                db.transaction(function (tx) {
                    tx.executeSql('DROP TABLE IF EXISTS tbSecrets')
                    tx.executeSql(secretTbCreateQuery)
                }, logError(error));
            },
            addSecret: function (secret, verification, preview, success, error) {
                console.log("addSecret: Init")
                previewStorage.setPreview(secret.SecretID, preview, function (imageURI) {
                    db.transaction(function (tx) {
                        tx.executeSql('INSERT INTO tbSecrets ' +
                            '(SecretID, Verification,  Status, RevealPercentage, RevealFacebookID, PeopleAddedSecret,RevealPhoneNumber ,NumOfSuspects , PeopleNeededMoreToSolve )' +
                            'VALUES (' + secret.SecretID + ',"' + verification + '","' + secret.Status + '",' + (secret.RevealPercentage || 0) + ',' + (secret.RevealFacebookID || 0) + ',' + (secret.PeopleAddedSecret || 0) + ',' + (secret.RevealPhoneNumber || 0) + ',' + (secret.NumOfSuspects || 0) + ',"' + (secret.PeopleNeededMoreToSolve || 0) + '")')
                        if (success)
                            success()
                    }, logError(error))

                }, error)
            },
            deleteSecret: function (SecretID, success, error) {
                console.log("deleteSecret: Init")

                db.transaction(function (tx) {
                    tx.executeSql('DELETE FROM tbSecrets WHERE SecretID=' + SecretID)
                    if (success)
                        success()
                }, logError(error))
            },
            updateSecret: function (secret, success, error) {
                console.log("updateSecret: Init")
                db.transaction(function (tx) {
                    tx.executeSql('UPDATE  tbSecrets SET ' +
                        'Status="' + secret.Status + '",' +
                        'RevealPercentage=' + (secret.RevealPercentage || 0) + ', ' +
                        'RevealFacebookID=' + (secret.RevealFacebookID || 0) + ', ' +
                        'NumOfSuspects =' + (secret.NumOfSuspects || 0) + ', ' +
                        'PeopleNeededMoreToSolve  ="' + (secret.PeopleNeededMoreToSolve || 0) + '", ' +
                        'PeopleAddedSecret=' + (secret.PeopleAddedSecret || 0) + ', ' +
                        'RevealPhoneNumber=' + (secret.RevealPhoneNumber || 0) +
                        ' WHERE SecretID = ' + secret.SecretID)

                    if (success)
                        success()
                }, logError(error))
            },
            setContacts: function (myPhoneNumber, contacts, success, error) {
                console.log("setContacts: Init")

                window.localStorage["myPhoneNumber"]=(convertPhoneNumber(myPhoneNumber))

                db.transaction(function (tx) {
                    tx.executeSql('DROP TABLE IF EXISTS tbContacts')
                    tx.executeSql('CREATE TABLE IF NOT EXISTS tbContacts (name, phone)')
                    var uniqueContacts = []
                    for (var i = 0; i < contacts.length; i++) {

                        if (uniqueContacts.indexOf(contacts[i].phone) == -1) {
                            uniqueContacts.push(contacts[i].phone)

                            var sql_q = 'INSERT INTO tbContacts (name, phone) VALUES ("' + contacts[i].name + '","' + convertPhoneNumber(contacts[i].phone) + '")'
                            tx.executeSql(sql_q, [], function (tx, rawresults) {

                            }, logError(error));
                        }
                    }
                    console.log("setContacts: " + uniqueContacts.length + " rows found.");
                    if (success)
                        success()
                }, logError(error));
            },
            getContacts: function (success, error) {
                console.log("getContacts: Init")
                var response = {}
                response.rows = []
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM tbContacts;', [], function (tx, rawresults) {
                        var len = rawresults.rows.length;
                        console.log("getContacts: " + len + " rows found.");
                        for (var i = 0; i < len; i++) {
                            response.rows.push(rawresults.rows.item(i));
                        }
                        if (success)
                            success(response)

                    }, logError(error));
                }, logError(error));
                return response
            },
            findContactName: function (phoneNumber, success, error) {
                console.log("findContactName: Init")
                var response = ""
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM tbContacts WHERE phone="' + phoneNumber + '"', [], function (tx, rawresults) {
                        var len = rawresults.rows.length;
                        console.log("findContactName: " + len + " rows found.");
                        if (len > 0) {
                            response = rawresults.rows.item(0).name
                        }
                        else {
                            response = false
                        }
                        if (success)
                            success(response)

                    }, logError(error));
                }, logError(error));
                return response
            }
        }
    }])
//</editor-fold>

    //<editor-fold  desc="profile">
    .factory('profile', ["secretsStorage", "mainCommander", "$http",function (secretsStorage, mainCommander, $http) {
        var timeStamp = -1
        var profile = this


        return {
            facebookName: function (facebookId, success, error) {

                $http.get(' http://graph.facebook.com/v1.0/' + facebookId + '?fields=name').
                    success(function (data, status, headers, config) {
                        if (success)
                            success(data.name)
                        return data.name;
                    }).
                    error(error);
            },

            diamonds: function (value) {

                if (value != undefined)
                {
                    console.log("diamonds: SET")
                    window.localStorage.setItem("diamonds", value)
                }
                else
                {
                    console.log("diamonds: GET")
                    return window.localStorage.getItem("diamonds") || 0
                }

            },
            myPhoneNumber: function (value) {

                if (value != undefined)
                {
                    console.log("myPhoneNumber: SET")
                    window.localStorage.setItem("myPhoneNumber", value)
                }
                else
                {
                    console.log("myPhoneNumber: GET")
                    return window.localStorage.getItem("myPhoneNumber") || ""
                }

            },
            money: function (value) {

                if (value != undefined)
                {
                    console.log("money: SET")
                    window.localStorage.setItem("money", value)
                }
                else
                {
                    console.log("money: GET")
                    return  window.localStorage.getItem("money") || 0
                }

            },
            FacebookID: function (value) {

                if (value != undefined)
                {
                    console.log("FacebookID: SET")
                    window.localStorage.setItem("FacebookID", value)
                }

                else
                {
                    console.log("FacebookID: GET")
                    return window.localStorage.getItem("FacebookID") || 0
                }

            },
            updateBalance: function (result) {
                var profile = this
                console.log("updateBalance: Init")
                profile.FacebookID(result.FacebookID)
                profile.diamonds(result.Diamonds)
                profile.money(result.Money)
            },
            getInfo: function (success, error) {
                console.log("getInfo: Init")
                var profile = this
                var userInfo = {}
                userInfo.money = profile.money()
                userInfo.diamonds = profile.diamonds()
                userInfo.FacebookID = profile.FacebookID()
                userInfo.secretsQuantity = 5
                userInfo.secrets = {}
                userInfo.secrets.rows = []
                secretsStorage.getAllSecrets(function (secrets) {
                    console.log("getInfo: " + secrets.rows.length + " secrets found in DB")

                    secrets.rows.sort(function (a, b) {
                        return (a.SecretID * 1 > b.SecretID * 1) ? -1 : 1
                    })
                    userInfo.secrets = secrets
                    if (success)
                        success(userInfo)

                    if ((((new Date()) - timeStamp) / 1000 < 10 && timeStamp != -1) || navigator.connection.type == "none") {
                        console.log("getInfo: no server call")
                        return userInfo;
                    }
                    else {

                        console.log("getInfo: server call init")
                        mainCommander.run({}, {
                            command: 'GET_FULL_DATA',
                            "fbToken": profile.fbToken(),
                            "fbID": profile.FacebookID()
                        }, function (result) {
                            timeStamp = new Date()
                            console.log("getInfo: server success init")
                            userInfo.money = result.Money
                            userInfo.diamonds = result.Diamonds
                            userInfo.FacebookID = result.FacebookID
                            profile.FacebookID(result.FacebookID)
                            profile.diamonds(result.Diamonds)
                            profile.money(result.Money)
                            var filteresSecretsArray = []


                            for (var i = 0; i < result.Secrets.length; i++) {

                                var offlineSecret = userInfo.secrets.rows.filter(function (row) {
                                    return row.SecretID * 1 == result.Secrets[i].SecretID * 1
                                })

                                if (offlineSecret.length == 1) {

                                    result.Secrets[i].Verification = offlineSecret[0].Verification
                                    secretsStorage.updateSecret(result.Secrets[i])
                                    var index = userInfo.secrets.rows.indexOf(offlineSecret[0])
                                    userInfo.secrets.rows.splice(index, 1)
                                    filteresSecretsArray.push(result.Secrets[i])
                                }
                            }

                            for (var i = 0; i < userInfo.secrets.rows.length; i++) {
                                (function (SecretID) {
                                    secretsStorage.deleteSecret(SecretID, function () {
                                        console.log("Offline secret deleted from local DB " + SecretID)
                                    })
                                })(userInfo.secrets.rows[i].SecretID)

                            }


                            filteresSecretsArray.sort(function (a, b) {
                                return (a.SecretID * 1 > b.SecretID * 1) ? -1 : 1
                            })

                            userInfo.secrets.rows = filteresSecretsArray
                            return userInfo;
                        }, error)
                    }
                })
            },
            registered: function (value) {

                if (value != undefined)
                {
                    console.log("registered: SET")
                    window.localStorage.setItem("registered", value)
                }
                else
                {
                    console.log("registered: GET")
                    return window.localStorage.getItem("registered") || false
                }

            },
            flurryId: function()
            {
                if(this.os()=="ios")
                {
                    return "JNYYXNM93ZV9BM4Q2FZH"
                }
                else
                {
                    return  "5YW7Z38YRH8GPKHXPRFC"
                }
            },
            os: function (value) {

                if (value != undefined)
                {
                    console.log("os: SET")
                    window.localStorage.setItem("os", value)
                }

                else
                {
                    console.log("os: GET")
                    return window.localStorage.getItem("os") || false
                }

            },
            contacts: function (value) {

                if (value != undefined)
                {
                    console.log("contacts: SET")
                    window.localStorage.setItem("contacts", value)
                }

                else
                {
                    console.log("contacts: GET")
                    return window.localStorage.getItem("contacts") || false
                }

            },
            deviceToken: function (value) {

                if (value != undefined)
                {
                    console.log("deviceToken: SET")
                    window.localStorage.setItem("device", value)
                }
                else
                {
                    console.log("deviceToken: GET")
                    return window.localStorage.getItem("device") || false
                }

            },
            fbToken: function (value) {

                if (value != undefined)
                {
                    console.log("fbToken: SET")
                    window.localStorage.setItem("fbToken", value)
                }

                else
                {
                    console.log("fbToken: GET")
                    return window.localStorage.getItem("fbToken") || false
                }

            },
            showAds: function (value) {

                if (value != undefined)
                {
                    console.log("showAds: SET")
                    window.localStorage.setItem("showAds", value)
                }

                else
                {
                    console.log("showAds: GET")
                    return window.localStorage.getItem("showAds") || false
                }

            },
            wasInapp: function (value) {

                if (value != undefined)
                {
                    console.log("wasInapp: SET")
                    window.localStorage.setItem("wasInapp", value)
                }

                else
                {
                    console.log("wasInapp: GET")
                    return window.localStorage.getItem("wasInapp") || false
                }

            }
        }
    }])
//</editor-fold>

