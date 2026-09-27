/* Präpositionen chapter page — script. Markup: index.html · styles: praepositionen.css
   Each card opens its exercise. The ?v= in data-target is the exercise's refresh number:
   raise it when that exercise changes, together with the Home tile's praepositionen/?v= */

/* Inside Home, Home opens the exercise, so it arrives with the same fade + zoom as from Home (Home 5.94).
   Opened on its own (or an older Home): plain page change. */
document.querySelectorAll("[data-target]").forEach(button => {
  button.addEventListener("click", () => {
    try {
      if (window.parent !== window && typeof window.parent.openChapterExercise === "function") {
        window.parent.openChapterExercise(new URL(button.dataset.target, location.href).href);
        return;
      }
    } catch (e) {}
    window.location.href = button.dataset.target;
  });
});
