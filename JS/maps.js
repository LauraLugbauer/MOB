
window.buildMapsUrl = async function(venue) {
    if (venue.location?.latitude && venue.location?.longitude) {
        return `https://www.google.com/maps/search/?api=1&query=${venue.location.latitude},${venue.location.longitude}`;
    }
};
