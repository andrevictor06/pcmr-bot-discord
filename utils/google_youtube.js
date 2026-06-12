const {google} = require('googleapis');
const path = require('path');
// If modifying these scopes, delete token.json.
const SCOPES = [ 'https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/youtube.force-ssl', 'https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtubepartner',];

/**
 * Load or request or authorization to call APIs.
 *
 */
function authorize() {
  return new google.auth.GoogleAuth({
    keyFile: path.resolve(process.env.PATH_CREDENTIALS_YOUTUBE),
    scopes: SCOPES
  })
}

function getYouTube(){
  return  google.youtube({version: 'v3', auth: authorize()});
}

async function uploadFileOnDrive(bot, fileMetadata, media, callback){
    const drive = getDrive();
    
    fileMetadata.parents = ['1tOmoUgzmB5y_wiJgd_LT-nfPpj2yRWxk']
    drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink',
      }, function (err, file) {
        if(callback)
            callback(bot, file, err);
        
      });
}

module.exports = {
    uploadFileOnDrive,
    getYouTube
}