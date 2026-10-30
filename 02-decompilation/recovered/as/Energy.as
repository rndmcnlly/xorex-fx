package §as§.adamsmith.xorex
{
   public class Energy
   {
      
      public var n:int;
      
      public var lambda:Wavelength;
      
      public function Energy()
      {
         if(Boot_e5d4ab.skip_constructor)
         {
            return;
         }
         reset();
      }
      
      public function reset() : void
      {
         n = 0;
         lambda = null;
      }
      
      public function decrement() : void
      {
         if(n == 1)
         {
            reset();
         }
         else if(n > 0)
         {
            --n;
         }
      }
   }
}

