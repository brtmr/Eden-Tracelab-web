// Generated by CoffeeScript 1.4.0
(function() {
  var HEIGHT, MACHINE_VIEW, PROCESS_VIEW, STATES, THREAD_VIEW, WIDTH, ZOOM_TIMEOUT, trace_loaded, trace_metadata, tracelist_data, ui_locked, view;

  STATES = ["#7B84E0", "#8CED87", "#E87D9C", "#F5FF85"];

  ZOOM_TIMEOUT = 500;

  WIDTH = 1300;

  HEIGHT = 700;

  MACHINE_VIEW = 1;

  PROCESS_VIEW = 2;

  THREAD_VIEW = 4;

  view = MACHINE_VIEW;

  trace_metadata = null;

  tracelist_data = [];

  trace_loaded = false;

  ui_locked = false;

  $(function() {
    var calculate_minimum_duration, draw_machine_events, draw_process_events, load_machine_events_initial, load_process_events_initial, mk_height, populate_options, switch_view, toggle_view_buttons, update_tracelist, view_preload;
    $("#loading").hide();
    update_tracelist = function() {
      return $.post("/traces", {}, function(data, status) {
        if (status !== "success") {
          alert("failed to fetch trace list");
          return;
        }
        tracelist_data = data;
        return populate_options();
      });
    };
    populate_options = function() {
      var x, _i, _len, _results;
      $("#trace_list").find("option").remove();
      _results = [];
      for (_i = 0, _len = tracelist_data.length; _i < _len; _i++) {
        x = tracelist_data[_i];
        _results.push($("#trace_list").append("<option value=\"" + x.id + "\">" + x.filename + "</option>"));
      }
      return _results;
    };
    view_preload = function(callback) {
      var id;
      if (trace_metadata !== null) {
        $("#loading").show();
        callback();
        return;
      }
      trace_metadata = {};
      if (!trace_loaded) {
        id = $("#trace_list").val();
      } else {
        id = trace_metadata.id;
      }
      $("#loading").show();
      return $.post("/traceinfo", {
        "id": id
      }, function(data, status) {
        var m, p, _i, _j, _len, _len1, _ref, _ref1;
        if (status !== "success") {
          alert("failed to load trace metadata.");
          return;
        }
        data.sort();
        trace_metadata.structure = data;
        trace_metadata.num_machines = data.length;
        trace_metadata.num_processes = 0;
        trace_metadata.num_threads = 0;
        _ref = trace_metadata.structure;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          m = _ref[_i];
          trace_metadata.num_processes += m[1].length;
          _ref1 = m[1];
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            p = _ref1[_j];
            trace_metadata.num_threads += p[1].length;
          }
        }
        return $.post("/duration", {
          "id": id
        }, function(dur, status) {
          if (status !== "success") {
            alert("failed to load trace metadata.");
            return;
          }
          trace_metadata.duration = dur[0];
          trace_metadata.id = id;
          return callback();
        });
      });
    };
    update_tracelist();
    load_machine_events_initial = function() {
      var params;
      params = {
        id: trace_metadata.id,
        start: 0,
        end: trace_metadata.duration,
        minduration: calculate_minimum_duration(0, trace_metadata.duration)
      };
      return $.post("/mevents", params, function(data, status) {
        if (status !== "success") {
          alert("failed to load machine events.");
          return;
        }
        trace_loaded = true;
        draw_machine_events(data);
        return $("#loading").hide();
      });
    };
    load_process_events_initial = function() {
      var params;
      params = {
        id: trace_metadata.id,
        start: 0,
        end: trace_metadata.duration,
        minduration: calculate_minimum_duration(0, trace_metadata.duration)
      };
      return $.post("/pevents", params, function(data, status) {
        if (status !== "success") {
          alert("failed to load machine events.");
          return;
        }
        trace_loaded = true;
        draw_process_events(data);
        return $("#loading").hide();
      });
    };
    switch_view = function(new_view) {
      view = new_view;
      $('canvas').remove();
      $('svg').remove();
      toggle_view_buttons(view);
      switch (view) {
        case MACHINE_VIEW:
          return view_preload(load_machine_events_initial);
        case PROCESS_VIEW:
          return view_preload(load_process_events_initial);
        case THREAD_VIEW:
      }
    };
    toggle_view_buttons = function() {
      $("#view_list").find("li").css("background-color", "#ddd");
      switch (view) {
        case MACHINE_VIEW:
          return $("#mview").css("background-color", "#fff");
        case PROCESS_VIEW:
          return $("#pview").css("background-color", "#fff");
        case THREAD_VIEW:
          return $("#tview").css("background-color", "#fff");
      }
    };
    calculate_minimum_duration = function(start, end) {
      var lod, total_duration;
      lod = $("#lod").val();
      total_duration = end - start;
      return Math.floor(total_duration / WIDTH / lod);
    };
    $("#update_button").click(update_tracelist);
    $("#load_button").click(function() {
      trace_metadata = null;
      trace_loaded = false;
      return switch_view(view);
    });
    $("#mview").click(function() {
      if (trace_loaded) {
        return switch_view(MACHINE_VIEW);
      }
    });
    $("#pview").click(function() {
      if (trace_loaded) {
        return switch_view(PROCESS_VIEW);
      }
    });
    $("#tview").click(function() {
      return alert("not yet implemented! sorry.");
    });
    mk_height = function(n) {
      if ((200 * n) > HEIGHT) {
        return HEIGHT;
      } else {
        return 50 * n;
      }
    };
    draw_machine_events = function(mevents) {
      var barheight, canvas, clear, context, draw, drawEvent, drawMachineName, drawTickLine, fake, height, lock_ui, margin, reload, tick_format, timer, unlock_ui, width, x, xAxis, xAxisContainer, xAxisSvg, zoom, zoomHandler;
      fake = d3.behavior.zoom();
      lock_ui = function() {
        $("#loading").show();
        ui_locked = true;
        canvas.call(fake);
        return $("#lod").prop("disabled", true);
      };
      unlock_ui = function() {
        canvas.call(zoom);
        $("#lod").prop("disabled", false);
        ui_locked = false;
        return $("#loading").hide();
      };
      margin = {
        top: 0,
        right: 1,
        bottom: 50,
        left: 100
      };
      width = WIDTH - margin.left - margin.right;
      height = mk_height(trace_metadata.num_machines) - margin.top - margin.bottom;
      x = d3.scale.linear().domain([0, trace_metadata.duration]).range([0, width]);
      tick_format = function(ns) {
        var s;
        s = ns / 1000000000;
        return '' + s + 's';
      };
      xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(10).tickFormat(tick_format);
      timer = null;
      reload = function() {
        var domain, params;
        lock_ui();
        domain = x.domain();
        params = {
          id: trace_metadata.id,
          start: Math.floor(domain[0]),
          end: Math.floor(domain[1]),
          minduration: calculate_minimum_duration(domain[0], domain[1])
        };
        return $.post("/mevents", params, function(data, status) {
          if (status !== "success") {
            alert("failed to load machine events.");
            unlock_ui();
            return;
          }
          mevents = data;
          draw();
          return unlock_ui();
        });
      };
      zoomHandler = function() {
        var dom, l;
        if (timer !== null) {
          clearTimeout(timer);
        }
        dom = x.domain();
        l = dom[1] - dom[0];
        if (dom[0] < 0) {
          zoom.translate([0, 0]);
        }
        xAxisContainer.call(xAxis);
        if (ui_locked) {
          return;
        }
        timer = setTimeout(reload, ZOOM_TIMEOUT);
        draw();
      };
      $("#set_lod").click(function() {
        if (timer !== null) {
          clearTimeout(timer);
        }
        return timer = setTimeout(reload, ZOOM_TIMEOUT);
      });
      zoom = d3.behavior.zoom().x(x).scaleExtent([1, Infinity]).on("zoom", zoomHandler);
      canvas = d3.select("body").append("canvas").attr("width", width + margin.left + margin.right).attr("height", height + margin.top).call(zoom);
      context = canvas.node().getContext("2d");
      canvas.on("mousemove", function() {
        var cos;
        cos = d3.mouse(this);
        draw();
        context.beginPath();
        context.moveTo(cos[0], 0);
        context.lineTo(cos[0], height + margin.top);
        context.stroke();
        context.fillStyle = "rgba(255,255,255,0.25)";
        context.fillRect(cos[0] - 10, 0, 20, height + margin.top);
        context.fillStyle = "white";
        context.fillRect(cos[0] + 5, cos[1], 120, -20);
        context.fillStyle = "black";
        context.font = "bold 12px sans-serif";
        return context.fillText('' + Math.floor(x.invert(cos[0]) + 0.5) + 'ns', cos[0] + 10, cos[1] - 5);
      });
      xAxisSvg = d3.select("body").append("svg").attr("width", width + margin.left + margin.right).attr("height", margin.bottom).append("g");
      xAxisContainer = xAxisSvg.append("g").attr("class", "axis").attr("transform", "translate(" + margin.left + ",0)").call(xAxis);
      barheight = {
        total: height / trace_metadata.num_machines,
        justbar: 0.85 * height / trace_metadata.num_machines,
        skip: 0.15 * height / trace_metadata.num_machines,
        idle: 0.2 * height / trace_metadata.num_machines
      };
      drawEvent = function(e) {
        context.fillStyle = STATES[e[3]];
        return context.fillRect(margin.left + x(e[1]), margin.top + (e[0] - 1) * barheight.total, x(e[1] + e[2]) - x(e[1]), e[3] === 0 ? barheight.idle : barheight.justbar);
      };
      drawTickLine = function(d) {
        var linePos;
        context.beginPath();
        linePos = Math.floor(margin.left + x(d)) + 0.5;
        context.moveTo(linePos, 0);
        context.lineTo(linePos, height + margin.top);
        return context.stroke();
      };
      clear = function() {
        return context.clearRect(0, 0, canvas.node().width, canvas.node().height);
      };
      drawMachineName = function(num) {
        var step;
        step = Math.floor(trace_metadata.num_machines / 32);
        if (trace_metadata.num_machines < 32) {
          step = 1;
        }
        if (num % step !== 0) {
          return;
        }
        context.fillStyle = "black";
        context.font = "14px sans-serif";
        return context.fillText("Machine #: " + num, 0, num * barheight.total - barheight.skip);
      };
      draw = function() {
        var d, e, n, ticks, _i, _j, _k, _len, _len1, _ref, _results;
        ticks = xAxis.scale().ticks(xAxis.ticks()[0]);
        clear();
        for (_i = 0, _len = mevents.length; _i < _len; _i++) {
          e = mevents[_i];
          drawEvent(e);
        }
        for (_j = 0, _len1 = ticks.length; _j < _len1; _j++) {
          d = ticks[_j];
          drawTickLine(d);
        }
        context.fillStyle = "white";
        context.fillRect(0, 0, margin.left, margin.top + height + margin.bottom);
        _results = [];
        for (n = _k = 1, _ref = trace_metadata.num_machines; 1 <= _ref ? _k <= _ref : _k >= _ref; n = 1 <= _ref ? ++_k : --_k) {
          _results.push(drawMachineName(n));
        }
        return _results;
      };
      return draw();
    };
    draw_process_events = function(pevents) {
      var barheight, canvas, clear, context, draw, drawMachineBackground, drawProcessEvent, drawTickLine, fake, height, lock_ui, machine_positions, make_machine_positions, margin, reload, tick_format, timer, unlock_ui, width, x, xAxis, xAxisContainer, xAxisSvg, zoom, zoomHandler;
      fake = d3.behavior.zoom();
      lock_ui = function() {
        $("#loading").show();
        ui_locked = true;
        canvas.call(fake);
        return $("#lod").prop("disabled", true);
      };
      unlock_ui = function() {
        canvas.call(zoom);
        $("#lod").prop("disabled", false);
        ui_locked = false;
        return $("#loading").hide();
      };
      margin = {
        top: 0,
        right: 1,
        bottom: 50,
        left: 100
      };
      width = WIDTH - margin.left - margin.right;
      height = mk_height(trace_metadata.num_machines) - margin.top - margin.bottom;
      x = d3.scale.linear().domain([0, trace_metadata.duration]).range([0, width]);
      tick_format = function(ns) {
        var prefix, s;
        s = ns / 1000000000;
        prefix = d3.formatPrefix(s);
        return '' + s + prefix.symbol + 's';
      };
      xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(10).tickFormat(tick_format);
      timer = null;
      reload = function() {
        var domain, params;
        lock_ui();
        domain = x.domain();
        params = {
          id: trace_metadata.id,
          start: Math.floor(domain[0]),
          end: Math.floor(domain[1]),
          minduration: calculate_minimum_duration(domain[0], domain[1])
        };
        return $.post("/pevents", params, function(data, status) {
          if (status !== "success") {
            alert("failed to load machine events.");
            unlock_ui();
            return;
          }
          pevents = data;
          draw();
          return unlock_ui();
        });
      };
      zoomHandler = function() {
        var dom, l;
        if (timer !== null) {
          clearTimeout(timer);
        }
        dom = x.domain();
        l = dom[1] - dom[0];
        if (dom[0] < 0) {
          zoom.translate([0, 0]);
        }
        xAxisContainer.call(xAxis);
        if (ui_locked) {
          return;
        }
        timer = setTimeout(reload, ZOOM_TIMEOUT);
        draw();
      };
      $("#set_lod").click(function() {
        if (timer !== null) {
          clearTimeout(timer);
        }
        return timer = setTimeout(reload, ZOOM_TIMEOUT);
      });
      zoom = d3.behavior.zoom().x(x).scaleExtent([1, Infinity]).on("zoom", zoomHandler);
      canvas = d3.select("body").append("canvas").attr("width", width + margin.left + margin.right).attr("height", height + margin.top).call(zoom);
      context = canvas.node().getContext("2d");
      canvas.on("mousemove", function() {
        var cos;
        cos = d3.mouse(this);
        draw();
        context.beginPath();
        context.moveTo(cos[0], 0);
        context.lineTo(cos[0], height + margin.top);
        context.stroke();
        context.fillStyle = "rgba(255,255,255,0.25)";
        context.fillRect(cos[0] - 10, 0, 20, height + margin.top);
        context.fillStyle = "white";
        context.fillRect(cos[0] + 5, cos[1], 120, -20);
        context.fillStyle = "black";
        context.font = "bold 12px sans-serif";
        return context.fillText('' + Math.floor(x.invert(cos[0]) + 0.5) + 'ns', cos[0] + 10, cos[1] - 5);
      });
      xAxisSvg = d3.select("body").append("svg").attr("width", width + margin.left + margin.right).attr("height", margin.bottom).append("g");
      xAxisContainer = xAxisSvg.append("g").attr("class", "axis").attr("transform", "translate(" + margin.left + ",0)").call(xAxis);
      barheight = {
        total: height / trace_metadata.num_processes,
        justbar: 0.85 * height / trace_metadata.num_processes,
        skip: 0.15 * height / trace_metadata.num_processes,
        idle: 0.2 * height / trace_metadata.num_processes
      };
      make_machine_positions = function() {
        var m, pos, res, tmp_y, _i, _len, _ref;
        res = [];
        tmp_y = 0;
        _ref = trace_metadata.structure;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          m = _ref[_i];
          pos = {
            y: tmp_y,
            height: m[1].length * barheight.total
          };
          tmp_y += pos.height;
          res.push(pos);
        }
        return res;
      };
      machine_positions = make_machine_positions();
      drawMachineBackground = function(pos) {
        context.fillStyle = "#eee";
        context.fillRect(margin.left, pos.y, width, pos.height);
      };
      drawProcessEvent = function(e) {
        var machine_offset;
        machine_offset = machine_positions[e[0] - 1].y;
        context.fillStyle = STATES[e[4]];
        return context.fillRect(margin.left + x(e[2]), margin.top + machine_offset + (e[1] - 1) * barheight.total, x(e[2] + e[3]) - x(e[2]), e[4] === 0 ? barheight.idle : barheight.justbar);
      };
      drawTickLine = function(d) {
        var linePos;
        context.beginPath();
        linePos = Math.floor(margin.left + x(d)) + 0.5;
        context.moveTo(linePos, 0);
        context.lineTo(linePos, height + margin.top);
        return context.stroke();
      };
      clear = function() {
        return context.clearRect(0, 0, canvas.node().width, canvas.node().height);
      };
      draw = function() {
        var e, pos, ticks, _i, _j, _len, _len1, _step;
        clear();
        for (_i = 0, _len = machine_positions.length, _step = 2; _i < _len; _i += _step) {
          pos = machine_positions[_i];
          drawMachineBackground(pos);
        }
        for (_j = 0, _len1 = pevents.length; _j < _len1; _j++) {
          e = pevents[_j];
          drawProcessEvent(e);
        }
        ticks = xAxis.scale().ticks(xAxis.ticks()[0]);
        context.fillStyle = "white";
        return context.fillRect(0, 0, margin.left, margin.top + height + margin.bottom);
      };
      return draw();
    };
  });

}).call(this);
