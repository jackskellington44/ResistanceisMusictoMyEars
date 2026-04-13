for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
        return match[1];
    }
}
return null;

const seenIds = new Set();

console.log(`Processing ${rawLinks.length} raw links...`);

for (const link of rawLinks) {
    const imageId = extractImageId(link);
    if (!imageId) {
        console.log(`Could not extract ID from: ${link}`);
        continue;
    }
    
    // Skip duplicates
    if (seenIds.has(imageId)) {
        console.log(`Duplicate skipped: ${imageId}`);
        continue;
    }
    seenIds.add(imageId);
    
    const image = {
        id: imageId,
        embedUrl: `https://embed.gettyimages.com/embed/${imageId}`,
        html: generateEmbedHTML(imageId),
        flashDuration: Math.random() * 2 + 1, // 1-3 seconds
        category: 'general'
    };
    
    processedImages.push(image);
    console.log(`Processed: ${imageId}`);
}

const config = {
    images: processedImages,
    settings: {
        beatSensitivity: 0.7,
        maxConcurrent: 15,
        flashDuration: 2.0,
        colorScheme: "monochrome"
    }
};

// Save processed config
try {
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log(`✅ Successfully processed ${processedImages.length} unique images into config.json`);
} catch (error) {
    console.error('Error writing config.json:', error);
}
