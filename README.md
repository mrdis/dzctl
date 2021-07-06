Trying to implement remote control for deezer (Still just a proof of concept!)

# Get started

1. Open the [install.html](https://mrdis.github.io/dzctl/install.html) page and drag the bookmarklet link on the bookmark bar
2. Open deezer and click on the bookmarklet. On the bottom left of the page a box will appear with "ID: XXXXXX - PIN: XXXX"
3. Open the [app.html](https://mrdis.github.io/dzctl/app.html) page, insert the ID and PIN and click connect
4. Now you should be able to control things on the deezer page!

# How it works

The bookmarklet injects the "inject-dzctl.js" script into the deezer webpage.
This script uses [Peer.js](https://peerjs.com/) to open a "server" endpoint that listen for connections from the "app"
When you open the app.html page and click connect, you will use the ID to connect to the "server" peer, and pass the PIN as a basic form of authentication.
From that point, the app will send commands to the server, and the server will sent status updates to the app
