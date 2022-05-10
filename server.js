'use strict';

const express = require('express');
const { Server } = require('ws');
var CryptoJS    = require("crypto-js");
var bodyParser  = require('body-parser');
var genUUID     = require('generate-safe-id');
var fs           = require("fs");
var bodyParser = require('body-parser')

const PORT = process.env.PORT || 3000;

//DATABASE
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const userScheme = new Schema({
    username: String,
    password: String,
    userUUID: String,
    chats:Array,
    phone:String
});
mongoose.connect("mongodb+srv://illia:1111@cluster0.zcsk7.mongodb.net/myFirstDatabase?retryWrites=true&w=majority", { useUnifiedTopology: true, useNewUrlParser: true });

const User = mongoose.model("User", userScheme);
// const user = new User({
//     username: "Bill",
//     password: 41
// });
  
// user.save(function(err){
//     mongoose.disconnect();  // отключение от базы данных
      
//     if(err) return console.log(err);
//     console.log("Сохранен объект", user);
// });

//SERVER
const server = express()
  .use(bodyParser.json())
  .set('view engine', 'ejs')
  .use(bodyParser.urlencoded({ extended: false }))
  .use(express.static(__dirname + '/public'))
  .get('/', function(req, res) {
    res.render('auntification');
  })
  .post('/aunt', async function(req, res) {
   console.log(req.body);
   let findUser = await User.find({username:req.body.name,password:req.body.pas});
   console.log(findUser)
   if(findUser.length!=0){
    res.render('index',{userData:findUser[0]});
   }else{
    res.redirect('/');
   }
 
  })
    //Реєстрація
  .get('/restration', function(req, res) {
    res.render('creatAcaunt');
  })
  .post('/plusChat', async function(req, res) {
    console.log(req.body);
    let user = await User.findOne({username:req.body.field_name});
    console.log(user)
    let findUserForChat = await User.findOne({username:req.body.name});
    console.log(findUserForChat)
    if(findUserForChat!=null){
        if(user.chats.find(element => element == findUserForChat.username)==undefined){
            user.chats.push(req.body.name)
            await user.save();
            findUserForChat.chats.push(req.body.field_name)
            await findUserForChat.save();
            res.status(204).send();
        }else{
            res.status(204).send();
        }
    }else{
        res.status(204).send();
    }
    })
  .post('/restr', async function(req, res) {
    let ifuserValid = await User.findOne({username:req.body.name});
    let ifphoneValid = await User.findOne({phone:req.body.phone});
    if(ifuserValid==null){
        if(ifphoneValid==null){
            const user = new User({
                username: req.body.name,
                password: req.body.pas,
                phone:req.body.phone,
                chats:[]
            });
            user.save();
            res.redirect('/');
        }else{
            res.send('<h2>Цей номер вже зареєстрований</h2><input type="button" onclick="history.back();" value="Назад"/>');
        }

    }else{
        res.send('<h2>Цей користувач вже існує</h2><input type="button" onclick="history.back();" value="Назад"/>'); 
    }
   // console.log(req.body)11;
   
   })

  .listen(PORT, () => console.log(`Listening on ${PORT}`));



let sockets = {};

function broadcast( socket, ownIncluded, data ){

    var data = ( typeof data === "object" ? JSON.stringify(data) : data );

    var toRemove = {};
    
    for (var sock_id in sockets ) {
        var sock = sockets[ sock_id ];

        if ( true/*sock.readyState == WebSocket.OPEN*/ ){

            if( ownIncluded ){
                sock.send( data );

            }else if ( sock != socket ){
                sock.send( data );

            }

        }else{
            toRemove[ sock_id ] = 1;
            
        }

    };

    for (var sock_id in toRemove ) {
        console.info( 'DELETE: UUID: ['+sock_id+']' );
        delete sockets[ sock_id ];

    };

    /*
    socket.readyState != WebSocket.CONNECTING
    socket.readyState != WebSocket.OPEN
    socket.readyState != WebSocket.CLOSING
    socket.readyState != WebSocket.CLOSED
    */

}

// --------------------------------------------------------------------
// [BLOCKCHAIN]

var Chain = {

    // --------------------------------------
    chain_f : 'blockchain.data',
    blocks : [],
    inited : false,

    // --------------------------------------
    Block : class {
        constructor(index, parentHash, data, ownHash) {
            this.index          = index;
            this.parentHash     = parentHash.toString();
            this.ownHash        = ownHash.toString();
            this.timestamp      = Date.now();
            this.data           = typeof data === "object" ? JSON.stringify(data) : data;
        }
    },

    // --------------------------------------
    getLastBlock : function(){
        return this.blocks[ this.blocks.length - 1 ];

    },

    getAllBlocks : function(){
        return this.blocks;

    },

    getBlockNum : function( num ){

        if( num > -1 &&  num < this.blocks.length ){
            return this.blocks[ num ];
            
        }

        return false;

    },

    // --------------------------------------
    appendIfValid : function( block ){
       
        //console.log(parentBlock )  -parentBlock.data
        // if(block.author==parentBlock.author&&block.msg==parentBlock.msg){
        //     return
        // }
        var chain_len       = this.blocks.length;
        var _isValidChain   = true;
        var parentBlock     = this.getLastBlock();
        let time1 = new Date(JSON.parse(block.data).date).getTime();
        let time2 = new Date(JSON.parse(parentBlock.data).date).getTime();
        let blockD = JSON.parse(block.data);
        let pBlock = JSON.parse(parentBlock.data);
        console.log(time1-time2);
        if(time1-time2<1000&&blockD.author==pBlock.author&&blockD.msg==pBlock.msg ){
            return false;
        }
        //console.log(JSON.parse(parentBlock.data).date)
        // console.log( parentBlock );
        // console.log( "\n\n" );
        // console.log( block );
        // console.log( block.ownHash );
        // console.log( block.data );

        var ownHash = this.calcBlockHash( parentBlock.index+1, parentBlock.ownHash, block.data );

        // console.log( ownHash );
        // return;

        if( ownHash !== block.ownHash || parentBlock.ownHash !== block.parentHash ){

            // console.error( 'ownHash !== block.ownHash: ', ownHash !== block.ownHash );
            // console.error( '@@ ownHash: ['+ownHash+']' );
            // console.error( '@@ block.ownHash: ['+block.ownHash+']' );
            // console.error( '## ownHash: ['+ownHash.length+']' );
            // console.error( '## block.ownHash: ['+block.ownHash.length+']' );

            // console.error( 'parentBlock.ownHash != block.parentHash: ', parentBlock.ownHash !== block.parentHash );
            // console.error( '@@ parentBlock.ownHash: ['+parentBlock.ownHash+']' );
            // console.error( '@@ block.parentHash: ['+block.parentHash+']' );
            // console.error( '## parentBlock.ownHash: ['+parentBlock.ownHash.length+']' );
            // console.error( '## block.parentHash: ['+block.parentHash.length+']' );

            console.error( ' DEPTH 0: BLOCKCHAIN ERROR ' );
            return false;

        }

        if( chain_len >= 3 ){

            let DEPTH = 0;

            for (var i = (chain_len-1); i > (chain_len-1) - 3; i--) {

                if( i-1 == 0 ){ // INITIAL BLOCK <<< BLOCK ZERO does't have parent [Block || Hash]
                    // return true;
                    break;
                }

                var parentBlock   = this.getBlockNum( i-1 );
                var _block   = this.getBlockNum( i );

                // console.log( parentBlock );
                // console.log( _block );

                var ownHash   = this.calcBlockHash( parentBlock.index+1, parentBlock.ownHash, _block.data );

                if( ownHash !== _block.ownHash || parentBlock.ownHash != _block.parentHash ){
                    console.error( ' DEPTH '+DEPTH+': BLOCKCHAIN ERROR ' );
                    var _isValidChain = false;
                    break;

                }

                DEPTH++;

            }

        }

        if( _isValidChain ){
            

            console.info( ' #BLOCKCHAIN: New Block added: ID: ['+block.index+'] HASH: ['+block.ownHash+']' );

            this.blocks.push( block );

            if( this.saveChain() ){
                console.error( ' #BLOCKCHAIN: Saved' );

                broadcast( null, false, JSON.stringify({
                    method : 'onNewBlock',
                    block  : block,

                }));

                return true;

            }else{
                console.error( ' #BLOCKCHAIN: NOT Saved' );

            }

        }

        return false;

    },

    calcBlockHash : function( index, prevHash, data){

        var data = typeof data === "object" ? JSON.stringify( data ) : data;
        return CryptoJS.SHA256(index + prevHash + data).toString();

    },

    createBlock: function( blockData ){

        var blockData   = typeof blockData === "object" ? JSON.stringify( blockData ) : blockData;
        var parentBlock = this.getLastBlock();
        var ownHash     = this.calcBlockHash( parentBlock.index+1, parentBlock.ownHash, blockData );
        var block       = new Chain.Block( parentBlock.index+1, parentBlock.ownHash, blockData, ownHash );

        return this.appendIfValid( block )

    },
    
    // --------------------------------------
    genesisBlock : function(){

        var initData = {
            date    : ( new Date() ),
            author  : '#Blockchain',
            msg     : 'init message',
        };

        return new this.Block(0, "0", initData, "4736da8abed4f7db7156afc3676993258165344c2e6337db8a921823784c1378"); 

    },

    init : function(){

        if (fs.existsSync( this.chain_f )) {

            var blockchain_raw = fs.readFileSync('blockchain.data');
            this.blocks = JSON.parse( blockchain_raw );

            if( typeof this.blocks === "object" )
                this.inited = true;

            // typeof this.blocks

        }else{

            this.blocks.push( this.genesisBlock() );
            this.inited = this.saveChain();

        }

        if( this.inited )
            console.info( ' #BLOCKCHAIN: INIT ... ' );

    },

    // --------------------------------------
    saveChain : function(){

        try{

            var e = fs.writeFileSync( this.chain_f, JSON.stringify( this.blocks, null, '    ' ), 'utf8')
            return true;

        }catch(e){
            console.error( 'ERROR: saveChain: ', e );
            return false;
        }

    },

    // --------------------------------------

}

Chain.init();

if( !Chain.inited ){
    console.info( ' #BLOCKCHAIN: ERROR ... ' );
    return;
}

// [ TEST ]
/*
Chain.createBlock({
    date    : ( new Date() ),
    author  : '#Blockchain',
    msg     : 'init message',
});

// return;

*/
// /[BLOCKCHAIN]

// --------------------------------------------------------------------

//var server = new WebSocket.Server({port: p2p_port});
const wss = new Server({ server });

wss .on('connection', function(socket){
    console.log("conect")
    // ------------------------------
    var UUID = genUUID();
    console.info( 'on.connection: UUID: ['+UUID+']' );
    socket.UUID = UUID;
    sockets[ UUID ] = socket;

    // ------------------------------
    // [CHAT - EVENTS - METHODS]
    var _Chat = {
        onChatInit : function (json_t){
            Chain.getAllBlocks().forEach( function( block ){

                var data = JSON.parse( block.data );
        
                socket.send( JSON.stringify({
                    method  : 'onNewChatMessage',
                    date    : data.date,
                    author  : data.author,
                    msg     : data.msg
                }));
        
            })
            
        },

        onNewChatMessage : function (json_t){
            console.info( 'onNewChatMessage: ', json_t.msg.split('___')[1] );

            // console.info( sockets );

            for (var sock_id in sockets ) {
                var sock = sockets[ sock_id ];

                // console.info( 'sock.readyState: ', sock.readyState );

                if ( true/*sock.readyState == WebSocket.OPEN*/ ){

                    console.info( 'send' );

                    Chain.createBlock({
                        date    : ( new Date() ),
                        author  : json_t.msg.split('___')[1],
                        msg     : json_t.msg.split('___')[0],
                    });

                    sock.send( JSON.stringify({
                        method  : 'onNewChatMessage',
                        date    : ( new Date() ),
                        author  : json_t.msg.split('___')[1],
                        msg     : json_t.msg.split('___')[0],
                    }));

                }else{
                    console.warn( ' SOCK ID: ['+sock.UUID+'] IS NOT AVAILABLE' );
                }
            }

        },

    }

    // ------------------------------
    // [BLOCKCHAIN - EVENT - METHODS]
    let _BlockChain = {

        onGetBlockID : function( json_t ){
            return Chain.getBlockNum( json_t.block_id );
        },

        onGetLastBlock : function( json_t ){
            return Chain.getLastBlock();
        },

        onNewBlock : function( json_t ){
            return Chain.appendIfValid( json_t.block )

        },

    };


    // ------------------------------
    socket.on('message', function(data){
        console.log("onm")
        try{

            var json_t = JSON.parse( data );
            // console.info( typeof json_t.method );

            if( typeof json_t.method === "string" ){
                _Chat[ json_t.method ]( json_t );
                return true;
            }

            if( typeof json_t.method === "string" ){
                _BlockChain[ json_t.method ]( json_t );
                return true;
            }

            console.error( 'ERROR: method name NOT AVAILABLE' );
            return true;

        }catch(e){
            console.error( 'ERROR: ', e );
        }

    }); 

    socket.on('close', function(data){
        console.info( 'on.close: ', data );
        delete sockets[ socket.UUID ];

    });

    socket.on('error', function(data){
        console.info( 'on.error: ', data );
        delete sockets[ socket.UUID ];

    });

    // ------------------------------
    broadcast( socket, false, JSON.stringify({
        method : 'onNewChatClient',
        name   :  socket.UUID,

    }));

    Chain.getAllBlocks().forEach( function( block ){

        var data = JSON.parse( block.data );

        socket.send( JSON.stringify({
            method  : 'onNewChatMessage',
            date    : data.date,
            author  : data.author,
            msg     : data.msg
        }));

    })

    // ------------------------------

});
