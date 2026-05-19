//
//



function ui_used_save_canvas() {}

//function setup() {}
function setup_ui() {
  const s = ui_scale;

  ui = {
    posX: 0,
    posY: height
  };

  let x = ui.posX;
  let y = ui.posY;

  // ---------- HEADER ----------
  ui_header = createDiv("TOOLS");
  ui_header.position(x, y);
  ui_header.size(90 * s, 20 * s);
  ui_header.style("background", "#2b2b2b");
  ui_header.style("color", "white");
  ui_header.style("padding", `${4 * s}px ${8 * s}px`);
  ui_header.style("font-family", "monospace");
  ui_header.style("font-size", `${12 * s}px`);
  ui_header.style("border-radius", `${4 * s}px`);

  y += 28 * s; // move down


  // ---------- BRUSH TYPE SELECT ----------
  ui_select_brush_type = createSelect();
  ui_select_brush_type.position(x, y);
  ui_select_brush_type.size(90 * s, 20 * s);
  ui_select_brush_type.style("font-family", "monospace");
  ui_select_brush_type.style("font-size", `${12 * s}px`);
  ui_select_brush_type.style("background", "#f0f0f0");
  ui_select_brush_type.style("border", "1px solid #ccc");
  ui_select_brush_type.style("border-radius", `${3 * s}px`);

  const types = ["Air","Sand","Water","Mud","Stone","Sponge","Life","Poison","Wasp","Snow","Lava","Gas","Virus"];
  types.forEach(t => ui_select_brush_type.option(t, t.toLowerCase()));

  y += 30 * s;


  // ---------- SLIDER ROW HELPER ----------
  function make_slider_row(labelDiv, slider, startY) {
    // Value box
    labelDiv.position(x, startY);
    labelDiv.size(40 * s, 20 * s);
    labelDiv.style("background", "#e8e8e8");
    labelDiv.style("border", "1px solid #bbb");
    labelDiv.style("border-radius", `${4 * s}px`);
    labelDiv.style("font-family", "monospace");
    labelDiv.style("font-size", `${12 * s}px`);
    labelDiv.style("text-align", "center");
    labelDiv.style("line-height", `${20 * s}px`);

    // Slider
    slider.position(x + 45 * s, startY + 3 * s);
    slider.size(120 * s, 14 * s);
  }


  // ---------- BRUSH SIZE ----------
  ui_brush_size_display = createDiv("1");
  ui_brush_size = createSlider(1, 100, 1, 1);

  make_slider_row(ui_brush_size_display, ui_brush_size, y);

  y += 30 * s;


  // ---------- BRUSH DENSITY ----------
  ui_brush_density_display = createDiv("1");
  ui_brush_density = createSlider(1, 100, 1, 1);

  make_slider_row(ui_brush_density_display, ui_brush_density, y);

  y += 40 * s;


  // ---------- SAVE BUTTON ----------
  ui_save_canvas = createButton("Save Canvas");
  ui_save_canvas.position(x, y);
  ui_save_canvas.size(90 * s, 24 * s);
  ui_save_canvas.style("background", "#3a7bd5");
  ui_save_canvas.style("color", "white");
  ui_save_canvas.style("border-radius", `${4 * s}px`);
  ui_save_canvas.style("font-family", "monospace");
  ui_save_canvas.style("font-size", `${12 * s}px`);
}
