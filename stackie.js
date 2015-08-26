var Stackie = function() {
  var API={};
  var random;    
  var gradient; 

  function setSeed(seed) {
     random=makeRandom(seed);
     gradient = makePerlinGradient(256,256);
  }

  setSeed(42);

  function makePerlinGradient(w,h)   {
    result= new Float32Array(w*h*2);
    for (var i=0;i<w*h*2;i+=2) {
      var r=(random()*Math.PI*2);    
      result[i] = Math.sin(r);
      result[i+1] = Math.cos(r);
    }
    return(result);
  }


  function Field(w,h) {
    var data=new Float32Array(w*h);
    function getValue(x,y) { return data[y*w+x]; }
    function setValue(x,y,value) { data[y*w+x]=value; }
    
    function generate(fn) {
      for (var ty=0;ty<h; ty++) {
        for (var tx=0;tx<w; tx++) {
          var x=tx/w;
          var y=ty/h;
          setValue(tx,ty,fn(x,y));
        }
      }    
    }
    var grey = makePaletteMapper("x");

    function getImageData(map) {
      map=map||grey;
      var image=new ImageData(w,h);
      var pixels= new Uint32Array(image.data.buffer);
      for (var i=0; i<pixels.length; i++) {
        pixels[i]=map(data[i]);
      }
      return image;
    }
    
    this.get = getValue;
    this.set = setValue;
    this.getImageData = getImageData;
    this.generate=generate;
  }

  function makeOp() {
    var state;
    function push(v){state.push(v)};
    function pop(){return state.pop()};

    function bi(fn) { return function() {var b=pop(); push(fn(pop(),b));}}
    function un(fn) { return function() { push(fn(pop()));} }
    function p(v) { return function() { push(v); } }
    function pushStateVar(name) { return function () {push(state[name]);}}
    var ops={
      "x": pushStateVar("x"),
      "y": pushStateVar("y"),
      "t": pushStateVar("t"),
      "*": bi(function(a,b){return a*b}),    
      "/": bi(function(a,b){return a/b}),    
      "-": bi(function(a,b){return a-b}),
      "+": bi(function(a,b){return a+b}),
      "p": bi(perlin),
      "s": un(Math.sin),
      "c": un(Math.cos),
      "q": un(Math.sqrt),
      "a": bi(Math.atan2),
      "r": un(random),
      "<": bi(Math.min),
      ">": bi(Math.max),
      "l": un(Math.log),
      "^": bi(Math.pow),
      "P": p(Math.PI),
      "~": un(Math.abs),
      "!": un(function(x){return 1-x}),
      ":": (function() {var a=pop();var b=pop();push(a); push(b);}),
      ";": (function() {var a=pop();var b=pop();var c=pop();push(a); push(b); push(c);}),

      //";": (function() {s=s.concat(s.splice(-3,3).reverse());}),
      "d": (function() {var a=pop();push(a); push(a);})
    }
    for (var d=0; d<10;d++) { ops[""+d]=p(d); }

    function op(programState,opcode) {
      state=programState;
      ops[opcode]();
    }
    return op;
  }

  function program(code) {
      var op=makeOp();
      return function (x,y,t) {
        var state = [];  //{"stack":[], "x":x, "y":y, "t":1};
        state.x=x;
        state.y=y;
        state.t=t;
        for (var i=0; i<code.length; i++) {op(state,code[i]);}
        return state.pop();
      }
  }

  function clamp(v) {
    return v<0?0:v>1?1:v;
  }
  function byteSize(v) {
    return Math.floor(clamp(v)*255);
  }

  function makePaletteMapper(code) {
      var paletteProgram=program(code);
      var palette=[];
      for (i=0;i<256;i++){
        var r= byteSize(paletteProgram(i/256,0.0));
        var g= byteSize(paletteProgram(i/256,0.5));
        var b= byteSize(paletteProgram(i/256,1.0));
        palette.push(b<<16|g<<8|r|0xFF000000);
      }
      function paletteMapper(v) {
        return palette[byteSize(v)];
      }
      return paletteMapper;
  }

/*
  function stacky(x,y,t,code) {
    var s=[];
    function bi(fn) { return function() { var b=s.pop(); s.push(fn(s.pop(),b)); } }
    function un(fn) { return function() { s.push(fn(s.pop()));} }
    function p(v) { return function() { s.push(v); } }
    var ops={
      "x": p(x),
      "y": p(y),
      "t": p(t),
      "*": bi(function(a,b){return a*b}),    
      "/": bi(function(a,b){return a/b}),    
      "-": bi(function(a,b){return a-b}),
      "+": bi(function(a,b){return a+b}),
      "p": bi(perlin),
      "s": un(Math.sin),
      "c": un(Math.cos),
      "q": un(Math.sqrt),
      "a": bi(Math.atan2),
      "r": un(random),
      "<": bi(Math.min),
      ">": bi(Math.max),
      "l": un(Math.log),
      "^": bi(Math.pow),
      "P": p(Math.PI),
      "~": un(Math.abs),
      "!": un(function(x){return 1-x}),
      ":": (function() {var a=s.pop();var b=s.pop();s.push(a); s.push(b);}),
      ";": (function() {s=s.concat(s.splice(-3,3).reverse());}),
      "d": (function() {var a=s.pop();s.push(a); s.push(a);})
    }

    for (var d=0; d<10;d++) { ops[""+d]=p(d); }

    for (var i=0; i<code.length; i++) { ops[code[i]]();  }  
    return s.pop();
  }

  function old_program(code) {
     return function (x,y) {return stacky(x,y,code)}
  }
*/
  function perlin(x,y) {
    x=x%256;
    y=y%256;
    function ss(a,b,v) {var w = v*v*v*(v*(v*6-15)+10);  return (1.0-w)*a + (w*b); }
    function dg(ix,iy) {
      var gi=(iy*256+ix)*2;
      return ((x-ix)*gradient[gi]) + ((y-iy)*gradient[gi+1]);
    }
    var u=x&0xff;
    var v=y&0xff;
    var u1=(u+1)&0xff;
    var v1=(v+1)&0xff;
    var sx=x-u; 
    var sy=y-v;
    return ss(ss(dg(u,v),dg(u1,v),sx),ss(dg(u,v1),dg(u1,v1),sx),sy);
  }


  function makeRandom(seed) {
    var mw = seed & 0xffffffff;
    var mz = 173;
    function random () {
      mz=36969 * (mz&0xffff) + (mz >> 16);
      mw=18000 * (mw&0xffff) + (mw >> 16);
      return (((mz<<16) + mw) &0xffffffff ) / (0x100000000);
    }
    return random;
  }

  function generate(imageCode,paletteCode,size) {
    size=size||256;
    var f = new Field(size,size);
    var paletteMapper = makePaletteMapper(paletteCode||"x");
    f.generate(program(imageCode));
    return f.getImageData(paletteMapper);
  }


  API.makeField = function (w,h) { return new Field(w,h);}
  API.program=program;
  API.makeRandom=makeRandom;
  API.setSeed=setSeed;
  API.makePaletteMapper=makePaletteMapper;
  API.generate=generate;

  return API;
}();


