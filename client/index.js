MESSAGE_CONNECTED = 1;
MESSAGE_USER_JOINED = 2;
MESSAGE_USER_LEFT = 3;
MESSAGE_STROKE = 4;
MESSAGE_CLEAR = 5;

window.onload = function () {
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  var isDrawing = false;
  var strokeColor = "";
  var strokes = [];
  var socket = new WebSocket("ws://localhost:4000/ws");
  var otherColors = {};
  var otherStrokes = {};

  socket.onmessage = function (event) {
    var messages = event.data.split("\n");
    for (var i = 0; i < messages.length; i++) {
      var message = JSON.parse(messages[i]);
      onMessage(message);
    }
  };

  function onMessage(message) {
    switch (message.kind) {
      case MESSAGE_CONNECTED:
        strokeColor = message.color;
        for (var i = 0; i < message.users.length; i++) {
          var user = message.users[i];
          otherColors[user.id] = user.color;
          otherStrokes[user.id] = [];
        }
        break;
      case MESSAGE_USER_JOINED:
        otherColors[message.user.id] = message.user.color;
        otherStrokes[message.user.id] = [];
        break;
      case MESSAGE_USER_LEFT:
        delete otherColors[message.userId];
        delete otherStrokes[message.userId];
        update();
        break;
      case MESSAGE_STROKE:
        if (message.finish) {
          otherStrokes[message.userId].push(message.points);
        } else {
          var strokes = otherStrokes[message.userId];
          strokes[strokes.length - 1] = strokes[strokes.length - 1].concat(
            message.points
          );
        }
        update();
        break;
      case MESSAGE_CLEAR:
        otherStrokes[message.userId] = [];
        update();
        break;
    }
  }

  canvas.onmousedown = function (event) {
    isDrawing = true;
    addPoint(event.pageX - this.offsetLeft, event.pageY - this.offsetTop, true);
  };

  canvas.onmousemove = function (event) {
    if (isDrawing) {
      addPoint(event.pageX - this.offsetLeft, event.pageY - this.offsetTop);
    }
  };

  canvas.onmouseup = function () {
    isDrawing = false;
  };

  canvas.onmouseleave = function () {
    isDrawing = false;
  };

  function addPoint(x, y, newStroke) {
    var p = { x: x, y: y };
    if (newStroke) {
      strokes.push([p]);
    } else {
      strokes[strokes.length - 1].push(p);
    }
    socket.send(
      JSON.stringify({ kind: MESSAGE_STROKE, points: [p], finish: newStroke })
    );
    update();
  }

  function update() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;

    // Draw me
    ctx.strokeStyle = strokeColor;
    drawStrokes(strokes);

    // Draw others
    var userIds = Object.keys(otherColors);
    for (var i = 0; i < userIds.length; i++) {
      var userId = userIds[i];
      ctx.strokeStyle = otherColors[userId];
      drawStrokes(otherStrokes[userId]);
    }
  }

  function drawStrokes(strokes) {
    for (var i = 0; i < strokes.length; i++) {
      ctx.beginPath();
      for (var j = 1; j < strokes[i].length; j++) {
        var prev = strokes[i][j - 1];
        var current = strokes[i][j];
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(current.x, current.y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  document.getElementById("clearButton").onclick = function () {
    strokes = [];
    socket.send(JSON.stringify({ kind: MESSAGE_CLEAR }));
    update();
  };
};
