const { Jimp } = require('C:\\\\Users\\\\Sakshi Jamwal\\\\AppData\\\\Roaming\\\\npm\\\\node_modules\\\\jimp');

async function removeAlpha() {
  try {
    const image = await Jimp.read('./assets/icon.png');
    // Set a white background and remove alpha explicitly
    image.rgba(false).background(0xFFFFFFFF);
    await image.writeAsync('./assets/icon_no_alpha.png');
    console.log('Successfully created icon_no_alpha.png without alpha channel');
  } catch (err) {
    console.error('Error removing alpha:', err);
  }
}

removeAlpha();
