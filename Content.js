let bobRossImages = [
    "https://bit.ly/3Ck6DTU",
    "https://bit.ly/3ozQCVk",
    "https://bit.ly/3omYDN6"
];


const imgs = document.getElementsByTagName("img");
//const imgs = document.getElementsByTagName("ytd-thumbnail");
//const imgs2 = document.getElementsByTagName

const body = document.getElementsByTagName("body");
console.log(body);
for(const element of body) {
    element.onload = function() {
        for(const image of imgs) {
            modifyImage(image);
        }
    }
};

function test() {
    console.log("oi");
}
/**
 * 
 * @param {HTMLImageElement} image 
 */
function modifyImage(image) {
    const index = Math.floor(Math.random() * bobRossImages.length);
    image.src = bobRossImages[0];
    console.log(`replace image ${image.nodeName} with bob ross`);
}