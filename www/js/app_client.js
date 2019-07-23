const QD_DATA = "./data/quickdraw.json";
var qd_json = null;

var canevas = null;
var ctx = null;

$(document).ready( () => {

   // -- socket IO
   var socket = io();

   // -- canvas
   canevas = document.getElementById('canvas');
   ctx = canevas.getContext('2d');

   // -- on btn PRESS
   $("#talk").mousedown( () => {
      console.log("MOUSE DOWN");
      $("#talk").text("RELEASE TO PROCESS");
      socket.emit("start_talking");
   });

   // -- on btn RELEASE
   $("#talk").mouseup( () => {
      console.log("MOUSE UP");
      $("#talk").text("PRESS & TALK");
      socket.emit("stop_talking");
   })

   // -- from node: currently processing
   socket.on('processing_on', () => {
      $("#spinner").css("visibility", "visible");
   });

   // -- from node: processing over
   socket.on('processing_off', () => {
      $("#spinner").css("visibility", "hidden");
   });

   // -- replace transcript message
   socket.on('msg', (msg) => {
      $("#transcript").html(msg);
   });

   // -- get the related keyword
   socket.on('keyword', (keyword) => {
      console.log("*** " + keyword);
      seekQuickDraw(keyword);
   });

   loadQuickDraw();
});

// -- load the quickdraw json data
function loadQuickDraw()
{
   const opt = {
      method:"GET"
   }

   fetch(QD_DATA, opt)
      .then(data => { return data.json(); })
      .then(res => {
         qd_json = res;
         console.log("res: " + res.categories["car"].drawings[0].id);
      })
      .catch(err => { console.log("err: " + err);} )
}

// -- seek the quickdraw from category label
function seekQuickDraw(keyword)
{
   console.log("seekQuickDraw: " + keyword);
   
   if(qd_json == null)
   {
      console.log("Err: QuickDraw JSON NULL");
   }
   else
   {
      var rdm = Math.round(Math.random() * 2); // 0-1-2
      var drawing = qd_json.categories[keyword].drawings[rdm]; // get one of the 3 drawings for a category

      console.log("rdm = " + rdm);
      console.log("drawing = " + drawing.id);

      /*
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.lineCap  = "round";
      ctx.strokeStyle = "#007BFF";
      ctx.shadowColor = "#000";
      ctx.shadowOffsetX = -2;
      ctx.shadowOffsetY =  2;
      ctx.shadowBlur = 5;
      */

      /*
      const margin_x = 50;
      const margin_y = 50;
      const scale = 1;
      */

      /*
      drawing.strokes.forEach(stroke => {
         ctx.beginPath();
         var cpt = 0;
         stroke.forEach(point => {
            if(cpt == 0) ctx.moveTo(margin_x + (point[0] * scale), margin_y + (point[1] * scale));
            else ctx.lineTo(margin_x + (point[0] * scale), margin_y + (point[1] * scale));
            cpt++;
         });
         ctx.stroke();
      });
      */

      // -- prepare drawing then start drawing
      prepareDrawing(drawing).then( () => {
         drawNextStroke();
      });
   }

   $("#spinner").css("visibility", "hidden");
}

var curr_strokes = []; // the strokes to draw
var curr_nb_strokes = 0; // the number of strokes to draw
var curr_stroke = 0; // the currently being processed stroke
var curr_stroke_data = { percent:0 }; // the drawing progress of the current stroke in percent

// -- prepare the drawing data for the next drawing
function prepareDrawing(drawing)
{
   return new Promise((resolve) => {
      
      curr_strokes = []; // init/empty the curr_strokes array
      curr_nb_strokes = 0;
      curr_stroke = 0;
      curr_stroke_data.percent = 0;

      drawing.strokes.forEach(stroke => {
         var points = [];
         stroke.forEach(point => {
            points.push({ x:point[0], y:point[1] });
         });
         curr_strokes.push(points);
         curr_nb_strokes++;
      });

      resolve();
   });
}

// -- draw the next stroke of the current drawing
function drawNextStroke()
{
   if(curr_stroke < curr_nb_strokes)
   {
      curr_stroke_data.percent = 0; // RAZ percent

      TweenMax.to(curr_stroke_data, 0.5, {
         ease: Quad.easeOut,
         percent: 100,
         onUpdate: drawPath,
         onComplete: pathComplete
      });
   }
}

// -- on update: redraw
function drawPath()
{
   ctx.clearRect(0, 0, canvas.width, canvas.height);
   
   ctx.lineWidth = 4;
   ctx.lineJoin = "round";
   ctx.lineCap  = "round";
   
   ctx.strokeStyle = "#007BFF";
   
   ctx.shadowColor = "#000";
   ctx.shadowOffsetX = -2;
   ctx.shadowOffsetY =  2;
   ctx.shadowBlur = 5;

   const margin_x = 50;
   const margin_y = 50;
   const scale = 1;

   // -- quickly draw the previous strokes
   if(curr_stroke > 0)
   {
      for(var i=0; i < curr_stroke; i++)
      {
         ctx.beginPath();
         var points = curr_strokes[i];
         for(var j=0; j < points.length; j++)
         {
            if(j==0) ctx.moveTo(margin_x + (points[j].x * scale), margin_y + (points[j].y * scale));
            else ctx.lineTo(margin_x + (points[j].x * scale), margin_y + (points[j].y * scale));
         }
         ctx.stroke();
      }
   }

   // -- then draw the current stroke progress
   var curr_stroke_points = curr_strokes[curr_stroke];
   var curr_stroke_points_length = curr_stroke_points.length;

   //console.log("*** " + curr_stroke_points_length);

   var curr_stroke_points_id = Math.round((curr_stroke_points_length - 1) * (curr_stroke_data.percent / 100));

   //console.log("* " + curr_stroke_points_id);

   ///
   if(curr_stroke_points_id > 0)
   {
      ctx.beginPath();
      for(var k=0; k <= curr_stroke_points_id; k++)
      {
         if(k==0) ctx.moveTo(margin_x + (curr_stroke_points[k].x * scale), margin_y + (curr_stroke_points[k].y * scale));
         else ctx.lineTo(margin_x + (curr_stroke_points[k].x * scale), margin_y + (curr_stroke_points[k].y * scale));
      }
      ctx.stroke();
   }
}

// -- when the stroke is complete, go to the next stroke
function pathComplete()
{
   if(curr_stroke < curr_nb_strokes - 1)
   {
      curr_stroke++;
      drawNextStroke();
   }
}