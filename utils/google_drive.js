const {google} = require('googleapis');
const path = require('path');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata'];

/**
 * Load or request or authorization to call APIs.
 *
 */
function authorize() {
  return new google.auth.GoogleAuth({
    keyFile: path.resolve(process.env.PATH_CREDENTIALS_GOOGLEDRIVE),
    scopes: SCOPES
  })
}

function getDrive(){
  return google.drive({version: 'v3', auth: authorize()});
}

/**
 * Lists the names and IDs of up to 10 files.
 */
async function listFiles() {
  const drive = getDrive();

  const res = await drive.files.list({
    pageSize: 10,
    fields: 'nextPageToken, files(id, name)',
  });
  const files = res.data.files;
  if (files.length === 0) {
    console.log('No files found.');
    return;
  }

  console.log('Files:');
  files.map((file) => {
    console.log(`${file.name} (${file.id})`);
  });
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
    uploadFileOnDrive
}