package §as§.adamsmith.xorex
{
   import caurina.transitions.Tweener;
   import com.kongregate.as3.client.KongregateAPI;
   import flash.Lib;
   import flash.display.DisplayObject;
   import flash.display.Loader;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.events.KeyboardEvent;
   import flash.events.MouseEvent;
   import flash.media.Sound;
   import flash.net.URLRequest;
   import flash.ui.Keyboard;
   import haxe.Timer;
   import mochi.as3.MochiAd;
   import mochi.as3.MochiScores;
   import mochi.as3.MochiServices;
   
   public class Main extends MovieClip
   {
      
      public static var n:int;
      
      public static var initialEnemies:int;
      
      public static var combat:CombatModel;
      
      public static var ship:ShipModel;
      
      public static var keyDown:*;
      
      public static var sounds:Hash;
      
      public static var triggerSounds:Boolean;
      
      public static var mochiAds:Boolean;
      
      public static var mochiLeaderboard:Boolean;
      
      public static var kongregateApi:Boolean;
      
      public static var kongregate:KongregateAPI;
      
      public var tickStart:Number;
      
      public var termination:Loader;
      
      public var shipWrapper:Sprite;
      
      public var instructions:Loader;
      
      public var combatWrapper:Sprite;
      
      public function Main()
      {
         if(Boot_e5d4ab.skip_constructor)
         {
            return;
         }
         super();
         Lib.current.addChild(this);
         if(Main.kongregateApi)
         {
            Main.kongregate = new KongregateAPI();
            Lib.current.addChild(Main.kongregate);
         }
         if(Main.mochiAds || Main.mochiLeaderboard)
         {
            MochiServices.connect("175bdba03f1a0b9f",Lib.current);
         }
         if(Main.mochiAds)
         {
            MochiAd.showPreGameAd({
               "clip":Lib.current,
               "id":"175bdba03f1a0b9f",
               "res":"800x600",
               "ad_finished":init
            });
         }
         else
         {
            init();
         }
      }
      
      public static function main() : void
      {
         new Main();
      }
      
      public static function chooseOne() : int
      {
         return Random.randInt(0,Main.n);
      }
      
      public static function triggerEvent(param1:String) : void
      {
         if(Main.sounds.exists(param1) && Main.triggerSounds)
         {
            Main.sounds.get(param1).play();
         }
      }
      
      public function terminate() : void
      {
         var _loc1_:Number = Timer.stamp();
         var _loc2_:int = int(Math.round(1000 * (_loc1_ - tickStart)));
         if(Main.kongregateApi)
         {
            Main.kongregate.stats.submit("ExtrinsicStabilityCriterion",_loc2_);
         }
         if(Main.mochiLeaderboard)
         {
            MochiScores.showLeaderboard({
               "boardID":"abbe5d36edc347d2",
               "score":_loc2_
            });
         }
         Main.triggerEvent("logo");
         shipWrapper.removeChild(shipWrapper.getChildAt(0));
         combatWrapper.removeChild(combatWrapper.getChildAt(0));
         Main.triggerEvent("fizzle");
         stage.removeEventListener(KeyboardEvent.KEY_DOWN,onKeyDown);
         stage.removeEventListener(KeyboardEvent.KEY_UP,onKeyUp);
         stage.removeEventListener(Event.ENTER_FRAME,onEnter);
         termination.alpha = 1;
         addChild(termination);
         stage.addEventListener(KeyboardEvent.KEY_DOWN,onKeyDownReady);
         stage.addEventListener(MouseEvent.MOUSE_DOWN,onMouseDownReady);
      }
      
      public function onMouseDownReady(param1:MouseEvent) : void
      {
         beginPlay();
      }
      
      public function onKeyUp(param1:KeyboardEvent) : void
      {
         Main.keyDown[param1.keyCode] = false;
      }
      
      public function onKeyDownReady(param1:KeyboardEvent) : void
      {
         if(param1.keyCode == Keyboard.UP || param1.keyCode == Keyboard.DOWN)
         {
            beginPlay();
         }
      }
      
      public function onKeyDown(param1:KeyboardEvent) : void
      {
         if(!Boolean(Main.keyDown[param1.keyCode]))
         {
            Main.keyDown[param1.keyCode] = true;
            if(param1.keyCode == Keyboard.LEFT)
            {
               Main.ship.left();
            }
            if(param1.keyCode == Keyboard.RIGHT)
            {
               Main.ship.right();
            }
            if(param1.keyCode == Keyboard.UP)
            {
               Main.ship.fire();
            }
            if(param1.keyCode == Keyboard.DOWN)
            {
               Main.ship.gather();
            }
         }
      }
      
      public function onEnter(param1:Event) : void
      {
         if(Math.random() < 0.0725)
         {
            Main.combat.sprinkleOne();
            Main.triggerEvent("infest");
         }
         if(Main.combat.shouldTerminate())
         {
            terminate();
         }
      }
      
      public function init() : void
      {
         var _loc3_:* = null as String;
         var _loc4_:* = null as Sound;
         shipWrapper = new Sprite();
         combatWrapper = new Sprite();
         instructions = new Loader();
         instructions.load(new URLRequest("art/structies.swf"));
         termination = new Loader();
         termination.load(new URLRequest("art/termination.swf"));
         var _loc1_:Hash = new Hash();
         _loc1_.set("logo","sound/logo.mp3");
         _loc1_.set("thoracks","sound/thoracks-phase.mp3");
         _loc1_.set("fire","sound/fire.mp3");
         _loc1_.set("gather","sound/gather.mp3");
         _loc1_.set("fizzle","sound/fizzle.mp3");
         _loc1_.set("synth","sound/synthesize.mp3");
         _loc1_.set("infest","sound/infest.mp3");
         _loc1_.set("compact","sound/compact.mp3");
         Main.sounds = new Hash();
         var _loc2_:* = _loc1_.keys();
         while(Boolean(_loc2_.hasNext()))
         {
            _loc3_ = _loc2_.next();
            _loc4_ = new Sound();
            _loc4_.load(new URLRequest(_loc1_.get(_loc3_)));
            Main.sounds.set(_loc3_,_loc4_);
         }
         addChild(instructions);
         addChild(termination);
         termination.alpha = 0;
         instructions.alpha = 0;
         instructions.scaleY = 10;
         instructions.scaleX = 10;
         Tweener.addTween(instructions,{
            "alpha":1,
            "scaleY":1,
            "scaleX":1,
            "time":1
         });
         stage.addEventListener(KeyboardEvent.KEY_DOWN,onKeyDownReady);
         stage.addEventListener(MouseEvent.MOUSE_DOWN,onMouseDownReady);
         stage.addChild(combatWrapper);
         stage.addChild(shipWrapper);
         var _loc5_:MusakToggle = new MusakToggle(Main.sounds.get("thoracks"));
         _loc5_.x = 0;
         _loc5_.y = 580;
         stage.addChild(_loc5_);
         Main.triggerEvent("logo");
      }
      
      public function enableGoodies(param1:*) : void
      {
         Wavelengths.options.push([Wavelength.White,1]);
      }
      
      public function beginPlay() : void
      {
         var _loc3_:int = 0;
         stage.removeEventListener(KeyboardEvent.KEY_DOWN,onKeyDownReady);
         stage.removeEventListener(MouseEvent.MOUSE_DOWN,onMouseDownReady);
         tickStart = Timer.stamp();
         Tweener.removeAllTweens();
         termination.alpha = 0;
         instructions.alpha = 0;
         Main.combat = new CombatModel();
         Main.ship = new ShipModel(Main.combat);
         shipWrapper.addChild(Main.ship);
         shipWrapper.y = 150;
         Tweener.addTween(shipWrapper,{
            "y":0,
            "time":2
         });
         combatWrapper.addChild(Main.combat);
         combatWrapper.y = -150;
         Tweener.addTween(combatWrapper,{
            "y":0,
            "time":2
         });
         var _loc1_:int = 0;
         var _loc2_:int = Main.initialEnemies;
         while(_loc1_ < _loc2_)
         {
            _loc3_ = _loc1_++;
            Main.combat.sprinkleOne();
         }
         Main.keyDown = [];
         stage.addEventListener(KeyboardEvent.KEY_DOWN,onKeyDown);
         stage.addEventListener(KeyboardEvent.KEY_UP,onKeyUp);
         stage.addEventListener(Event.ENTER_FRAME,onEnter);
      }
   }
}

