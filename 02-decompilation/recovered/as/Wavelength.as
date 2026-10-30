package §as§.adamsmith.xorex
{
   public final class Wavelength
   {
      
      public static const __isenum:Boolean = true;
      
      public static var __constructs__:*;
      
      public static var Yellow:Wavelength;
      
      public static var White:Wavelength;
      
      public static var Red:Wavelength;
      
      public static var Pink:Wavelength;
      
      public static var Green:Wavelength;
      
      public static var Blue:Wavelength;
      
      public static var Black:Wavelength;
      
      public var tag:String;
      
      public var index:int;
      
      public var params:Array;
      
      public const __enum__:Boolean = true;
      
      public function Wavelength(param1:String, param2:int, param3:Object)
      {
         tag = param1;
         index = param2;
         params = param3;
      }
      
      final public function toString() : String
      {
         return Boot_e5d4ab.enum_to_string(this);
      }
   }
}

