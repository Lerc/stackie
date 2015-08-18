var Stackie = function() {
  var API={};

  function makePerlinGradient(w,h)   {
    result= new Float32Array(w*h*2);
    for (var i=0;i<w*h*2;i+=2) {
      var r=(Math.random()*Math.PI*2);    
      result[i] = Math.sin(r);
      result[i+1] = Math.cos(r);
    }
    return(result);
  }

  var gradient = makePerlinGradient(256,256);


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
    function grey(v) {
      if (v>1)v=1;
      if (v<0) v=0;
      var bright=(v*255)&0xff
      return bright|bright<<8|bright<<16|0xff000000
    }
    
    function getImageData(map) {
      if (!map) map=grey;
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

  function stacky(x,y,code) {
    var s=[];
    function bi(fn) { return function() { var b=s.pop(); s.push(fn(s.pop(),b)); } }
    function un(fn) { return function() { s.push(fn(s.pop()));} }
    function p(v) { return function() { s.push(v); } }
    var ops={
      "x": p(x),
      "y": p(y),
      "*": bi(function(a,b){return a*b}),    
      "/": bi(function(a,b){return a/b}),    
      "-": bi(function(a,b){return a-b}),
      "+": bi(function(a,b){return a+b}),
      "p": bi(perlin),
      "s": un(Math.sin),
      "c": un(Math.cos),
      "q": un(Math.sqrt),
      "a": bi(Math.atan2),
      "r": un(Math.random),
      "l": un(Math.log),
      "^": bi(Math.pow),
      "P": p(Math.PI),
      "~": un(Math.abs),
      "!": un(function(x){return 1-x}),
      "d": function() {var a=s.pop();s.push(a); s.push(a);}
    };
    for (var d=0; d<10;d++) { ops[""+d]=p(d); }
    for (var i=0; i<code.length; i++) { ops[code[i]]();  }  
    return s.pop();
  }

  function program(code) {
     return function (x,y) {return stacky(x,y,code)}
  }

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

  API.makeField = function (w,h) {
    return new Field(w,h);
  }
  API.program=program;
  return API;
}();


