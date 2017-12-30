function registerCallback(registrationId) {
  if (chrome.runtime.lastError) {
    // When the registration fails, handle the error and retry the
    // registration later.
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
   chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action","data": "ERROR!!!"});
  }); 
    return;
  }

  // Send the registration token to your application server.
  sendRegistrationId(function(succeed) {
    // Once the registration token is received by your server,
    // set the flag such that register will not be invoked
    // next time when the app starts up.
    if (succeed)
      chrome.storage.local.set({registered: true});
  }, registrationId);
}
/////////////////////////////////////////////////

var localIP = '';
function getLocalIPs(callback) {
        var ips = [];

        var RTCPeerConnection = window.RTCPeerConnection ||
            window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

        var pc = new RTCPeerConnection({
            // Don't specify any stun/turn servers, otherwise you will
            // also find your public IP addresses.
            iceServers: []
        });
        // Add a media line, this is needed to activate candidate gathering.
        pc.createDataChannel('');

        // onicecandidate is triggered whenever a candidate has been found.
        pc.onicecandidate = function(e) {
            if (!e.candidate) { // Candidate gathering completed.
                pc.close();
                callback(ips);
                return;
            }
            var ip = /^candidate:.+ (\S+) \d+ typ/.exec(e.candidate.candidate)[1];
            if (ips.indexOf(ip) == -1) // avoid duplicate entries (tcp/udp)
                ips.push(ip);
        };
        pc.createOffer(function(sdp) {
            pc.setLocalDescription(sdp);
        }, function onerror() {});
    }
    
////////////////////////////////////////////////
function sendRegistrationId(callback, registrationId) {
  // Send the registration token to your application server
  // in a secure way.
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
   chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action","data": registrationId});
  }); 
  var request = new XMLHttpRequest();

 request.open("POST", "http://192.168.1.3:3000/notificationid", true);
 request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
 request.send(JSON.stringify({id: registrationId, ip: localIP}));
 callback(true);
}

chrome.browserAction.onClicked.addListener(function() {
  getLocalIPs(function(ips) { // <!-- ips is an array of local IP addresses.
            localIP = ips[1];
            chrome.storage.local.get("registered", function(result) {
            // If already registered, bail out.
            if (result["registered"])
              return;
            // Up to 100 senders are allowed.
            var senderIds = ["511909021329"];
            chrome.gcm.register(senderIds, registerCallback);
          });
        });
});
chrome.gcm.onMessage.addListener(function(message) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    var opt = {
           type: 'list',
           title: 'Intranet Chat',
           message: 'Message',
           priority: 1,
           items: [{ title: message.data.fromname+': ', message: message.data.message}],
           iconUrl:'icon.png'

       };
       chrome.notifications.create('id_'+(message.data.fromname).replace(' ', '_'), opt, function(id) {});
   chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action","data": JSON.stringify(message)});
  }); 
});

