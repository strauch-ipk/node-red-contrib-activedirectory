module.exports = function (RED) {
  function findGroupNode (config) {
    RED.nodes.createNode(this, config)
    const node = this
    var configNode=RED.nodes.getNode(config.configName);
    var cUsername;
    var cPassword;
    if(configNode){
      //fetch centralized properties
      node.url=configNode.url;
      //fetch centralized credentials
      cUsername = configNode.credentials.username;
      cPassword = configNode.credentials.password;
    }else{
      node.status({ fill: 'red', shape: 'dot', text: 'configuration error' })
      node.error('ERROR connecting, no valid configuration specified')
      /* we get the properties
      node.url = config.url
      // we get the credentials
      const cUsername = this.credentials.username
      const cPassword = this.credentials.password*/
    }
    //Get node-specific properties
    node.baseDN = config.baseDN
    node.on('input', function (msg) {
      node.status({ fill: 'blue', shape: 'ring', text: 'connecting' })
      // import activedirectory2
      const ActiveDirectory = require('activedirectory2')
      const adConfig = {
        url: node.url,
        baseDN: node.baseDN,
        username: cUsername,
        password: cPassword
      }
      // set attributes if defined
      if (msg.ad_attributes) {
        // Validates the Object format (required for IBMi platform)
        adConfig.attributes = JSON.parse(JSON.stringify(msg.ad_attributes))
      }
      if (msg.tlsOptions) {
        // Validates the Object format (required for IBMi platform)
        adConfig.tlsOptions = JSON.parse(JSON.stringify(msg.tlsOptions))
      }
      try {
        const ad = new ActiveDirectory(adConfig)
        node.status({ fill: 'green', shape: 'dot', text: 'connected' })
        // Find group by his DN
        const dn = msg.payload
        node.status({ fill: 'blue', shape: 'ring', text: 'querying' })
        ad.findGroup(dn, function (err, group) {
          if (err) {
            const errTxt = 'ERROR querying: ' + JSON.stringify(err)
            node.status({ fill: 'red', shape: 'dot', text: errTxt })
            node.error(errTxt, msg)
          } else if (!group) {
            const errTxt = 'Group ' + dn + ' not found.'
            delete msg.payload
            msg.ad_error = errTxt
            node.status({ fill: 'yellow', shape: 'dot', text: errTxt })
            node.send(msg)
          } else {
            msg.payload = group
            node.status({ fill: 'green', shape: 'dot', text: 'Group ' + dn + ' found' })
            node.send(msg)
          }
        })
      } catch (e) {
        node.status({ fill: 'red', shape: 'dot', text: 'connection error' })
        node.error('ERROR connecting: ' + e.message, msg)
      }
    })
  }

  RED.nodes.registerType('find-group', findGroupNode, {
    credentials: {
      username: { type: 'text' },
      password: { type: 'password' }
    }
  })
}
