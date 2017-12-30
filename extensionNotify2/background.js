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

var socket = io.connect('http://192.168.1.2:3000');
socket.on("message intranet",function(data){
  getLocalIPs(function(ips) { // <!-- ips is an array of local IP addresses.
            localIP = ips[1];
            if(localIP==data.toinfo.ipAddr){
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              var request = new XMLHttpRequest();

               request.open("POST", "http://192.168.1.2:3000/notificationid11", true);
               request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
               request.send(JSON.stringify({message: data.message, ip: localIP}));

               chrome.runtime.sendMessage({message:"clicked_browser_action",data:data.message},function(response){});

                var activeTab = tabs[0];
                var opt = {
                       type: 'list',
                       title: 'Intranet Chat',
                       message: 'Message',
                       priority: 1,
                       items: [{ title: data.frominfo.name+': ', message: data.message}],
                       iconUrl:'icon.png'

                   };
                   chrome.notifications.create('id_'+(data.frominfo.name).replace(' ', '_'), opt, function(id) {});
          }); 
            }
        });
});

