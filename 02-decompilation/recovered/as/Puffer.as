package §as§.adamsmith.xorex
{
   import flash.display.MovieClip;
   import flash.events.Event;
   
   public class Puffer extends MovieClip
   {
      
      public var t:int;
      
      public function Puffer(param1:Wavelength = undefined)
      {
         if(Boot_e5d4ab.skip_constructor)
         {
            return;
         }
         super();
         var _loc2_:int = Wavelengths.toInt(param1);
         graphics.beginFill(_loc2_,0.012);
         graphics.drawCircle(0,0,10);
         graphics.drawCircle(0,0,40);
         graphics.drawCircle(0,0,5);
         graphics.endFill();
         addEventListener(Event.ENTER_FRAME,tick);
      }
      
      public function tick() : void
      {
         if(t == 100)
         {
            removeEventListener(Event.ENTER_FRAME,tick);
            parent.removeChild(this);
         }
         ++t;
         scaleX *= 1.1;
         scaleY *= 1.12;
      }
   }
}

