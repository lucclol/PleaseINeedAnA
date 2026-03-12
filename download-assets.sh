#!/bin/bash
# Run this script to download the image assets
cd "$(dirname "$0")/public/assets"

echo "Downloading images..."
curl -sL -o home-btn.png "https://image2url.com/r2/default/images/1773357603203-397429b5-5735-45d8-a9a0-c34c12fee80c.png"
curl -sL -o logo.png "https://image2url.com/r2/default/images/1773357779092-7021136d-cc9b-4c39-86c4-0bd0e1f2d877.png"
curl -sL -o about-bg-desktop.jpeg "https://image2url.com/r2/default/images/1773357825017-b76fa5b6-230b-45e1-8ae3-7f8bc288e056.jpeg"
curl -sL -o about-bg-phone.jpg "https://image2url.com/r2/default/images/1773357844015-e3831007-8e6a-45ba-9721-8f8afd146660.jpg"
echo "Done! Images saved to public/assets/"
ls -la
