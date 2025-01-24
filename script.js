document.addEventListener("DOMContentLoaded", function () {
  const elements = document.querySelectorAll(".hack");
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const revealInterval = 50;

  elements.forEach((element, index) => {
    const originalText = element.textContent;
    let lastTime = 0;
    let charsRevealed = 0;

    function animate(currentTime) {
      if (!lastTime) lastTime = currentTime;
      const elapsedTime = currentTime - lastTime;

      if (elapsedTime > revealInterval) {
        lastTime = currentTime;
        charsRevealed++;
        let newText = "";

        for (let i = 0; i < originalText.length; i++) {
          if (i < charsRevealed) {
            newText += originalText[i];
          } else {
            newText += alphabet[Math.floor(Math.random() * alphabet.length)];
          }
        }

        element.textContent = newText;

        if (newText !== originalText) {
          requestAnimationFrame(animate);
        } else if (index < elements.length - 1) {
          setTimeout(() => {
            requestAnimationFrame(elements[index + 1].animate);
          }, 500);
        }
      } else {
        requestAnimationFrame(animate);
      }
    }

    element.animate = animate;
  });

  if (elements.length > 0) {
    requestAnimationFrame(elements[0].animate);
  }
});
