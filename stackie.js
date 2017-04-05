var Stackie = ( ()=> {
  var API={};
  var bit30=1<<30;
  var random;    
  var variables="tuvxyz";
  var M=Math;

  var perlinGradientX;
  var perlinGradientY;
  
  var makeRandom=seed=>{
    var mw = seed & (bit30-1);
    var mz = 173;
    var random=()=>{
      mz=36969 * (mz&0xffff) + (mz >> 16);
      mw=18000 * (mw&0xffff) + (mw >> 16);
      return (((mz<<16) + mw) & (bit30-1) ) / (bit30);
    }
    return random;
  }

  var setSeed=seed=>{
    random=makeRandom(seed);
    var s=256;
    var randoms= new Float32Array(s*s*2).map(random);
    perlinGradientX=randoms.map(v=>M.sin(v*M.PI*2));
    perlinGradientY=randoms.map(v=>M.cos(v*M.PI*2));
  };

  setSeed(42);


/**
 * @constructor 
*/
  function Field(w=256,h=w) {
    var data=new Float32Array(w*h);
    var getValue=(x,y)=>data[y*w+x];
    var setValue=(x,y,value)=>data[y*w+x]=value;
    
    var generate = fn=>{
      for (var tx=0, ty=0; ty<h ;tx=tx+1<w?tx+1:0, ty+=tx?0:1) {
        setValue(tx,ty,fn(tx/w,ty/h));
      }
    }    
    /*
    function generate(fn) {
      for (var ty=0;ty<h; ty++) {
        for (var tx=0;tx<w; tx++) {
          var x=tx/w;
          var y=ty/h;
          setValue(tx,ty,fn(x,y));
        }
      }    
    }
    */    
    var getImageData=(map = makePaletteMapper("x"))=>{
      var image=new ImageData(w,h);
      var pixels= new Uint32Array(image.data.buffer);
      data.forEach((m,i)=>pixels[i]=map(m));
      /*
      for (var i=0; i<pixels.length; i++) {
        pixels[i]=map(data[i]);
      }
      */
      return image;
    }
    var t=this;
    t.get = getValue;
    t.set = setValue;
    t.getImageData = getImageData;
    t.generate=generate;
  }
  var ss=(v,a=0,b=1,w=v*v*v*(v*(v*6-15)+10))=>(1.0-w)*a+(w*b); 
  var positiveMod=(v,size,q=v%size)=>q<0?size-q:q;

  var makeOp= ()=>{
    var state;
    var push=v=>state.push(v);
    var pop=()=>state.pop();

    var stackOp=(argc,fn)=>( ()=>push(fn.apply(null,state.splice(-argc,argc))) );

    var bi= fn=>(()=>{var b=pop(); push(fn(pop(),b));});
    var un= fn=>( ()=>push(fn(pop())) );
    var p= v=>( ()=>push(v));

/*    
    function bi(fn) { return ()=>{var b=pop(); push(fn(pop(),b));}}
    function un(fn) { return ()=>push(fn(pop()));}
    function p(v) { return ()=>push(v); }
*/
    var pushStateVar=name=>(()=>push(state[name]));

    var ops={
      //"x": pushStateVar("x"),"y": pushStateVar("y"),"t": pushStateVar("t"),
      "*": bi((a,b)=>a*b),    
      "/": bi((a,b)=>a/b),    
      "-": bi((a,b)=>a-b),
      "+": bi((a,b)=>a+b),
      "p": bi(perlin),
      "w": stackOp(3,wrapPerlin),
      "W": stackOp(4,wrapPerlin),
      "e": stackOp(1,ss),
      "E": stackOp(3,ss),      
      "s": un(M.sin),
      "c": un(M.cos),
      "q": un(M.sqrt),
      "a": bi(M.atan2),
      "r": stackOp(0,random),
      "<": bi(M.min),
      ">": bi(M.max),
      "l": un(M.log),
      "^": bi(M.pow),
      "P": p(M.PI),
      "~": un(M.abs),
      "#": un(M.round),
      "$": un(M.floor),
      "%": stackOp(2,positiveMod),
      "!": un(x=>1-x),
      "?": un(x=>x<=0?0:1),
      ":": ()=> {var a=pop(), b=pop();push(a); push(b);},
      ";": ()=> {var a=pop(), b=pop(), c=pop();push(a); push(b); push(c);},
      "d": ()=> {var a=pop();push(a); push(a);}
    }
    for (var v in variables) ops[variables[v]]=pushStateVar(variables[v]);

    for (var i=0; i<10;i++) { ops[""+i]=p(i); }

    return (programState,opcode)=>{ state=programState; ops[opcode](); };
  }

  var program =code=>{
      var op=makeOp();
      return (x,y,t)=>{
        var state = [];  //{"stack":[], "x":x, "y":y, "t":1};
        state.x=x;
        state.y=y;
        state.t=t;
        //for (var c=0; i<code.length; i++) {op(state,code[i]);}
        for (var c of code) op(state,c);
        return state.pop();
      }
  }
  var clamp=v=>v<0?0:v>1?1:v;
  var byteSize=v=>M.floor(clamp(v)*255);

  var makePaletteMapper=code=>{
      var paletteProgram=program(code);
      var palette=[];
      for (var i=0;i<256;i++){
        var r= byteSize(paletteProgram(i/256,0.0));
        var g= byteSize(paletteProgram(i/256,0.5));
        var b= byteSize(paletteProgram(i/256,1.0));
        palette.push(0xff<<24|b<<16|g<<8|r);
      }
      return v=>palette[byteSize(v)];
  }
  
  var perlin=(x,y,wrapX=256,wrapY=wrapX)=> {    
    

    var dg=(ix,iy,gi=(positiveMod(iy,wrapY)*wrapX+positiveMod(ix,wrapX))*2)=>((x-ix)*perlinGradientX[gi])+((y-iy)*perlinGradientY[gi]);

    var u=M.floor(x);
    var v=M.floor(y);
    var sx=x-u; 
    var sy=y-v;
    var u1=(u+1);
    var v1=(v+1);
    return ss(sy,ss(sx,dg(u,v),dg(u1,v)),ss(sx,dg(u,v1),dg(u1,v1)));
  }

  var wrapPerlin=(x,y,wrapX=2,wrapY=wrapX)=>perlin(x*wrapX,y*wrapY,wrapX,wrapY);

  var generate=(imageCode,paletteCode,size=256) => {
    var f = new Field(size);
    var paletteMapper = makePaletteMapper(paletteCode||"x");
    f.generate(program(imageCode));
    return f.getImageData(paletteMapper);
  }

  API.makeField = (w,h)=>new Field(w,h);
  API.program=program;
  API.makeRandom=makeRandom;
  API.setSeed=setSeed;
  API.makePaletteMapper=makePaletteMapper;
  API.generate=generate;

  return API;
})();


