var Stackie = function() {
  var API={};
  var random;    
  var gradient;
  var variables="tuvxyz";
  var m=Math;   //minification will reduce this to one char;

  function setSeed(seed) {
     random=makeRandom(seed);
     gradient = makePerlinGradient(256,256);
  }

  setSeed(42);

  function makePerlinGradient(w,h)   {
    var result= new Float32Array(w*h*2);
    for (var i=0;i<w*h*2;i+=2) {
      var r=(random()*m.PI*2);    
      result[i] = m.sin(r);
      result[i+1] = m.cos(r);
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

    function getImageData(map) {
      map=map||makePaletteMapper("x");
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
    function stackOp(argc,fn) {
       return function () {push(fn.apply(null,state.splice(-argc,argc)))};
    }
    function bi(fn) { return function (){var b=pop(); push(fn(pop(),b));}}
    function un(fn) { return function (){push(fn(pop()));}}
    function p(v) { return function() { push(v); } }
    function pushStateVar(name) { return function () {push(state[name]);}}
    var ops={
      //"x": pushStateVar("x"),"y": pushStateVar("y"),"t": pushStateVar("t"),

      "*": bi(function(a,b){return a*b}),    
      "/": bi(function(a,b){return a/b}),    
      "-": bi(function(a,b){return a-b}),
      "+": bi(function(a,b){return a+b}),
      "p": bi(perlin),
      "w": stackOp(3,perlin),
      "W": stackOp(4,perlin),
      "s": un(m.sin),
      "c": un(m.cos),
      "q": un(m.sqrt),
      "a": bi(m.atan2),
      "r": stackOp(0,random),
      "<": bi(m.min),
      ">": bi(m.max),
      "l": un(m.log),
      "^": bi(m.pow),
      "P": p(m.PI),
      "~": un(m.abs),
      "#": un(m.round),
      "!": un(function(x){return 1-x}),
      "?": un(function(x){return x<=0?0:1}),
      ":": (function() {var a=pop();var b=pop();push(a); push(b);}),
      ";": (function() {var a=pop();var b=pop();var c=pop();push(a); push(b); push(c);}),

      //";": (function() {s=s.concat(s.splice(-3,3).reverse());}),
      "d": (function() {var a=pop();push(a); push(a);})
    }
    for (var d=0; d<10;d++) { ops[""+d]=p(d); }
    for (var v in variables) ops[variables[v]]=pushStateVar(variables[v]);


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
    return m.floor(clamp(v)*255);
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
  //this is the old form of stackie where the ops map was created on every pixel call.
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
      "s": un(m.sin),
      "c": un(m.cos),
      "q": un(m.sqrt),
      "a": bi(m.atan2),
      "r": un(random),
      "<": bi(m.min),
      ">": bi(m.max),
      "l": un(m.log),
      "^": bi(m.pow),
      "P": p(m.PI),
      "~": un(m.abs),
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
  function perlin(x,y,wrapX,wrapY) {
    function positiveMod(v,size) {
      v%=size;
      return v<0?size-v:v;
    }
    wrapX = wrapX || 256;
    wrapY = wrapY || wrapX;

    function ss(a,b,v) {var w = v*v*v*(v*(v*6-15)+10);  return (1.0-w)*a + (w*b); }
    function dg(ix,iy) {
      var gi=(positiveMod(iy,wrapY)*wrapX+positiveMod(ix,wrapX))*2;
      return ((x-ix)*gradient[gi]) + ((y-iy)*gradient[gi+1]);
    }

    var u=m.floor(x);
    var v=m.floor(y);
    var sx=x-u; 
    var sy=y-v;
    var u1=(u+1);
    var v1=(v+1);
    return ss(ss(dg(u,v),dg(u1,v),sx),ss(dg(u,v1),dg(u1,v1),sx),sy);
  }


  function makeRandom(seed) {
    var mw = seed & 0xffffffff;
    var mz = 173;
    function random () {
      mz=36969 * (mz&0xffff) + (mz >> 16);
      mw=18000 * (mw&0xffff) + (mw >> 16);
      return (((mz<<16) + mw) &0x7fffffff ) / (0x80000000);
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


