chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('window.html', {
    'innerBounds': {
      'width': 400,
      'height': 640
    }
  });
});
