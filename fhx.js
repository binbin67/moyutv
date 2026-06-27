const PHONE_PREFIX = "86";
const PHONE = "替换成您的手机号"; // 在这里填入您的凤凰秀手机号
const PWD = "替换成您的密码";     // 在这里填入您的凤凰秀密码

function readToken() {
    try {
        var file = new java.io.File(java.lang.System.getProperty("java.io.tmpdir"), "fengshows_token.txt");
        if (file.exists()) {
            var scanner = new java.util.Scanner(file, "UTF-8").useDelimiter("\\A");
            var token = scanner.hasNext() ? scanner.next() : null;
            scanner.close();
            return token;
        }
    } catch(e) {}
    return null;
}

function writeToken(token) {
    try {
        var file = new java.io.File(java.lang.System.getProperty("java.io.tmpdir"), "fengshows_token.txt");
        var writer = new java.io.FileWriter(file);
        writer.write(token);
        writer.close();
    } catch(e) {}
}

function postJson(urlStr, jsonBody) {
    try {
        var url = new java.net.URL(urlStr);
        var conn = url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json;charset=UTF-8");
        conn.setDoOutput(true);
        conn.setDoInput(true);
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(5000);
        
        var os = conn.getOutputStream();
        var input = new java.lang.String(jsonBody).getBytes("UTF-8");
        os.write(input, 0, input.length);
        os.flush();
        os.close();
        
        var responseCode = conn.getResponseCode();
        if (responseCode === 200) {
            var scanner = new java.util.Scanner(conn.getInputStream(), "UTF-8").useDelimiter("\\A");
            var result = scanner.hasNext() ? scanner.next() : null;
            scanner.close();
            return result;
        }
    } catch(e) {}
    return null;
}

function validateJWT(token) {
    try {
        var parts = token.split('.');
        if (parts.length !== 3) return false;
        
        var payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (payloadBase64.length % 4 !== 0) {
            payloadBase64 += '=';
        }
        
        var Base64 = Packages.android.util.Base64;
        var decodedBytes = Base64.decode(payloadBase64, 0); // 0 = Base64.DEFAULT
        var payloadJson = new java.lang.String(decodedBytes, "UTF-8");
        var payload = JSON.parse(payloadJson);
        
        var exp = payload.exp;
        if (!exp) return true;
        
        var now = Math.floor(java.lang.System.currentTimeMillis() / 1000);
        return exp > (now + 300);
    } catch (e) {
        return false;
    }
}

function getToken() {
    var token = readToken();
    if (token && validateJWT(token)) {
        return token;
    }
    
    // Request new token
    var body = {
        code: PHONE_PREFIX,
        keep_alive: false,
        password: PWD,
        phone: PHONE
    };
    
    var response = postJson("https://m.fengshows.com/api/v3/mp/user/login", JSON.stringify(body));
    if (response) {
        var data = JSON.parse(response);
        if (data.message === "ok" && data.data && data.data.token) {
            var newToken = data.data.token;
            writeToken(newToken);
            return newToken;
        }
    }
    
    return null;
}

function getPlayUrl(args) {
    var CHANNELS = {
        "fhzx": "7c96b084-60e1-40a9-89c5-682b994fb680",
        "fhzw": "f7f48462-9b13-485b-8101-7b54716411ec",
        "fhhk": "15e02d92-1698-416c-af2f-3e9a872b4d78"
    };

    var id = args;
    if (!id) id = 'fhzw';
    
    var chid = CHANNELS[id];
    if (!chid) return "";

    var token = "";
    var quality = "hd"; 
    

    if (PHONE !== "替换成您的手机号" && PWD !== "替换成您的密码") {
        token = getToken();
        if (token) {
            quality = "fhd";
        }
    }

    var apiUrl = 'https://m.fengshows.com/api/v3/hub/live/auth-url?live_qa=' + quality + '&live_id=' + chid;
    
    var headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Mobile Safari/537.36",
        "Referer": "https://m.fengshows.com/",
        "Origin": "https://m.fengshows.com"
    };
    
    if (token) {
        headers["Token"] = token;
    }

    try {
        var responseText = HttpBridge.fetchWithHeaders(apiUrl, JSON.stringify(headers));
        if (responseText) {
            var data = JSON.parse(responseText);
            if (data && data.data && data.data.live_url) {
                return data.data.live_url;
            } else if (quality === 'fhd') {

                var fallbackUrl = 'https://m.fengshows.com/api/v3/hub/live/auth-url?live_qa=hd&live_id=' + chid;
                var fallbackHeaders = {
                    "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Mobile Safari/537.36",
                    "Referer": "https://m.fengshows.com/",
                    "Origin": "https://m.fengshows.com"
                };
                var fallbackRes = HttpBridge.fetchWithHeaders(fallbackUrl, JSON.stringify(fallbackHeaders));
                if (fallbackRes) {
                    var fbData = JSON.parse(fallbackRes);
                    if (fbData && fbData.data && fbData.data.live_url) {
                        return fbData.data.live_url;
                    }
                }
            }
        }
    } catch (e) {

    }
    
    return "";
}
