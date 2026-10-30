package §as§.adamsmith.xorex
{
   import flash.display.MovieClip;
   import flash.events.MouseEvent;
   import flash.media.Sound;
   import flash.media.SoundChannel;
   import flash.text.TextField;
   
   public class MusakToggle extends MovieClip
   {
      
      public var sound:Sound;
      
      public var sc:SoundChannel;
      
      public function MusakToggle(param1:Sound = undefined)
      {
         if(Boot_e5d4ab.skip_constructor)
         {
            return;
         }
         super();
         sound = param1;
         addEventListener(MouseEvent.CLICK,onClick);
         sc = sound.play(0,16777215);
         var _loc2_:TextField = new TextField();
         _loc2_.text = "mute";
         addChild(_loc2_);
      }
      
      public function onClick(param1:MouseEvent) : void
      {
         if(sc == null)
         {
            sc = sound.play(0,16777215);
            Main.triggerSounds = true;
            Main.triggerEvent("logo");
         }
         else
         {
            sc.stop();
            sc = null;
            Main.triggerSounds = false;
         }
      }
   }
}

