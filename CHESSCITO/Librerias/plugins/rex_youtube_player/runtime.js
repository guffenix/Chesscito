﻿// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.rex_youtube_player = function(runtime)
{
	this.runtime = runtime;
};

(function ()
{
	var manuallyChanged = false;
	/////////////////////////////////////
	var pluginProto = cr.plugins_.rex_youtube_player.prototype;

	/////////////////////////////////////
	// Object type class
	pluginProto.Type = function(plugin)
	{
		this.plugin = plugin;
		this.runtime = plugin.runtime;
	};

	var typeProto = pluginProto.Type.prototype;

	typeProto.onCreate = function()
	{
	    //jsfile_load("https://www.youtube.com/iframe_api");
        // Function onYouTubeIframeAPIReady() should be defined before loading 
	};
	
	var jsfile_load = function(file_name)
	{
	    var scripts=document.getElementsByTagName("script");
	    var exist=false;	    
	    for(var i=0;i<scripts.length;i++)
	    {
	    	if(scripts[i].src.indexOf(file_name) != -1)
	    	{
	    		exist=true;
	    		break;
	    	}
	    }
	    if(!exist)
	    {
	    	var newScriptTag=document.createElement("script");
	    	newScriptTag.setAttribute("type","text/javascript");
	    	newScriptTag.setAttribute("src", file_name);
	    	document.getElementsByTagName("head")[0].appendChild(newScriptTag);
	    }
	};

	/////////////////////////////////////
	// Instance class
	pluginProto.Instance = function(type)
	{
		this.type = type;
		this.runtime = type.runtime;
	};

	var instanceProto = pluginProto.Instance.prototype;

	// called whenever an instance is created
    var IsAPIReady = false;
	instanceProto.onCreate = function()
	{
		// Not supported in DC
		if (this.runtime.isDomFree)
		{
			cr.logexport("[Construct 2] Textbox plugin not supported on this platform - the object will not be created");
			return;
		}
    
        // create div element
        this.myElemId = "YT" + this.uid.toString();
		this.elem = document.createElement("div");
		this.elem.id = this.myElemId;	 		
		jQuery(this.elem).appendTo(this.runtime.canvasdiv ? this.runtime.canvasdiv : "body");
		this.element_hidden = false;
		      
		this.lastLeft = null;
		this.lastTop = null;
		this.lastRight = null;
		this.lastBottom = null;
		this.lastWinWidth = null;
		this.lastWinHeight = null;

		if (this.properties[6] === 0)
		{
			jQuery(this.elem).hide();
			this.visible = false;
			this.element_hidden = true;
		}
					
		this.updatePosition(true);  // init position and size
		
		
        this.is_player_init = false;		
        this.youtube_player = null;
        this.youtube_state = -1;        
        this.cur_videoId = this.properties[0];
        this.cur_isAutoPlay = (this.properties[1] === 1);
        this.cur_isLooping = (this.properties[2] === 1);     
        this.show_controls = (this.properties[3] === 1);
		this.show_info = (this.properties[4] === 1);
		this.disablekb = (this.properties[5] === 0);
		this.exp_errorCode = 0;
		
        this.pended_cmds = [];
		this.runtime.tickMe(this);
        
        // init
        if (!window["onYouTubeIframeAPIReady"])
        {
            window["onYouTubeIframeAPIReady"] = function() 
            {
                IsAPIReady = true;                 
            };
	        jsfile_load("https://www.youtube.com/iframe_api");            
            // Function onYouTubeIframeAPIReady() should be defined before loading 
        }
        // init        
	};       

	instanceProto.onDestroy = function ()
	{
		if (this.youtube_player != null)
		    this.youtube_player["destroy"]();

		jQuery(this.elem).remove();
		this.elem = null;
	};

	instanceProto.tick = function ()
	{    
		this.updatePosition();	        
        this.on_player_init();		
	};

	instanceProto.updatePosition = function (first)
	{
		if (this.runtime.isDomFree)
			return;
		
		var left = this.layer.layerToCanvas(this.x, this.y, true);
		var top = this.layer.layerToCanvas(this.x, this.y, false);
		var right = this.layer.layerToCanvas(this.x + this.width, this.y + this.height, true);
		var bottom = this.layer.layerToCanvas(this.x + this.width, this.y + this.height, false);
		
		var rightEdge = this.runtime.width / this.runtime.devicePixelRatio;
		var bottomEdge = this.runtime.height / this.runtime.devicePixelRatio;
		
		// Is entirely offscreen or invisible: hide
		if (!this.visible || !this.layer.visible || right <= 0 || bottom <= 0 || left >= rightEdge || top >= bottomEdge)
		{
			if (!this.element_hidden)
				jQuery(this.elem).hide();
				
			this.element_hidden = true;
			return;
		}
		
		// Truncate to canvas size
		if (left < 0)
			left = 0;
		if (top < 0)
			top = 0;
		if (right > rightEdge)
			right = rightEdge;
		if (bottom > bottomEdge)
			bottom = bottomEdge;
		
		var curWinWidth = window.innerWidth;
		var curWinHeight = window.innerHeight;
			
		// Avoid redundant updates
		if (!first && this.lastLeft === left && this.lastTop === top && this.lastRight === right && this.lastBottom === bottom && this.lastWinWidth === curWinWidth && this.lastWinHeight === curWinHeight)
		{
			if (this.element_hidden)
			{
				jQuery(this.elem).show();
				this.element_hidden = false;
			}
			
			return;
		}
			
		this.lastLeft = left;
		this.lastTop = top;
		this.lastRight = right;
		this.lastBottom = bottom;
		this.lastWinWidth = curWinWidth;
		this.lastWinHeight = curWinHeight;
		
		if (this.element_hidden)
		{
			jQuery(this.elem).show();
			this.element_hidden = false;
		}
		
		var offx = Math.round(left) + jQuery(this.runtime.canvas).offset().left;
		var offy = Math.round(top) + jQuery(this.runtime.canvas).offset().top;
		jQuery(this.elem).css("position", "absolute");
		jQuery(this.elem).offset({left: offx, top: offy});
		jQuery(this.elem).width(Math.round(right - left));
		jQuery(this.elem).height(Math.round(bottom - top));
	};

	// only called if a layout object
	instanceProto.draw = function(ctx)
	{
	};

	instanceProto.drawGL = function(glw)
	{
	};
    
    instanceProto.on_player_init = function ()
    {
        if (this.is_player_init)
            return; 
                    
        if (!IsAPIReady)
            return;
      
                                               
        this.is_player_init = true;       
        this.create_player(this.cur_videoId);        
    };    
	
	instanceProto.create_player = function (videoId)
	{
	    if (!this.is_player_init)
	        return;
	        
        if (this.youtube_player != null)
            return;
	        
	    var self = this;
	    var onPlayerStateChange = function (event)
	    {
	        if (event["data"] === self.youtube_state)
	            return;
	            
	        self.youtube_state = event["data"];	        
	        	        
	        // do looping
	        if ((self.youtube_state === 0) && self.cur_isLooping)
	        {
	            self.youtube_player["playVideo"]();
	        } 

	        self.runtime.trigger(cr.plugins_.rex_youtube_player.prototype.cnds.OnPlaybackEvent, self);
	    };
	    
	    var onPlayerReady = function (event)
	    {	         
	        self.run_pended_cmds();	        
	        self.runtime.trigger(cr.plugins_.rex_youtube_player.prototype.cnds.OnPlayerReady, self);
	    };

		var onPlayerError = function (event)
		{
			self.exp_errorCode = event["data"];
			self.runtime.trigger(cr.plugins_.rex_youtube_player.prototype.cnds.OnPlayerError, self);
		};	    
          
	    var playerVars = {};
	    if (this.cur_isAutoPlay)
	        playerVars["autoplay"] = 1;
	        
	    if (!this.show_controls)
	        playerVars["controls"] = 0;

		if (!this.show_info)
			playerVars["showinfo"] = 0;

		if (!this.disablekb)
			playerVars["disablekb"] = 1;	        
	     
        this.youtube_player = new window["YT"]["Player"](
            this.myElemId, 
            { "videoId": videoId,    
              "playerVars": playerVars,                      
              "events": {"onStateChange": onPlayerStateChange,
                         "onReady": onPlayerReady,
                         "onError": onPlayerError
                        }
            }
        );    
        
        // element DIV had been replaced by IFRAME
        jQuery(this.elem).remove();
        this.elem = document.getElementById(this.myElemId);
	};	
	
    instanceProto.run_pended_cmds = function ()
    {
        var i, cnt=this.pended_cmds.length, cmd;
        for(i=0; i<cnt; i++)
        {
            cmd = this.pended_cmds[i];
            this.youtube_player[cmd[0]].apply(this.youtube_player, cmd[1]);
        }
        
        this.pended_cmds.length = 0;
    };

	instanceProto.LoadVideoID = function (videoId, is_autoplay)
	{	    
	    this.cur_videoId = videoId;
	    this.cur_isAutoPlay = is_autoplay;
	    if (!this.youtube_player || !this.youtube_player["loadVideoById"])
	    {	        
		    this.pended_cmds.push(["loadVideoById", [videoId]]);
		    var cmd = (is_autoplay)? "playVideo" : "pauseVideo";
		    this.pended_cmds.push([cmd, []]);		        
		    return;	        
	    }
	    
	    this.youtube_player["loadVideoById"](videoId);
	};
	
	instanceProto.SetPlaybackTime = function (s)
	{	    
		if (!this.youtube_player || !this.youtube_player["seekTo"])
		{
		    this.pended_cmds.push(["seekTo", [s]]);
		    return;
		}

        // ready
		this.youtube_player["seekTo"](s);
	};

	var SetFullScreen = function (elem)
	{
        var requestFullScreen = elem.requestFullScreen || elem.mozRequestFullScreen || elem.webkitRequestFullScreen;
        if (requestFullScreen)        
            requestFullScreen.bind(elem)();
	};
	
	instanceProto.SetLooping = function (l)
	{
	    this.cur_isLooping = l;
	};
	
	instanceProto.SetMuted = function (m)
	{
	    var cmd = (m)? "mute" : "unMute";	
		if (!this.youtube_player || !this.youtube_player[cmd])
		{
		    this.pended_cmds.push([cmd, []]);
		    return;
		}

        // ready			    	    
	    this.youtube_player[cmd]();
	};
	
	instanceProto.SetVolume = function (v)
	{
	    var vol = cr.clamp(v, 0, 100);
		if (!this.youtube_player || !this.youtube_player["setVolume"])
		{
		    this.pended_cmds.push(["setVolume", [vol]]);
		    return;
		}

        // ready		    
		this.youtube_player["setVolume"]( vol );    
	};
	
	instanceProto.Pause = function ()
	{
		if (!this.youtube_player || !this.youtube_player["pauseVideo"])
		{
		    this.pended_cmds.push(["pauseVideo", []]);
		    return;
		}

        // ready			
		this.youtube_player["pauseVideo"]();
	};
	
	instanceProto.Play = function ()
	{
	    if (!this.youtube_player || !this.youtube_player["playVideo"])
		{
		    this.pended_cmds.push(["playVideo", []]);
		    return;
		}

        // ready		
		this.youtube_player["playVideo"]();
	};
		
	instanceProto.get_playbackTime = function (ret)
	{
	    var t;
		if (!this.youtube_player || !this.youtube_player["getCurrentTime"])
		    t = 0;
		else
		    t = this.youtube_player["getCurrentTime"]() || 0;
		    
		return t;
	};
	
	instanceProto.get_duration = function (ret)
	{
	    var t;	    
		if (!this.youtube_player || !this.youtube_player["getDuration"])
		    t = 0;
		else
		    t = this.youtube_player["getDuration"]() || 0;
			    
		return t;
	};
	
	instanceProto.get_volume = function (ret)
	{
	    var vol;
		if (!this.youtube_player || !this.youtube_player["getVolume"])
		    vol = 100;
		else
		    vol = this.youtube_player["getVolume"]() || 100;
		    
		return vol;
	};
	
	instanceProto.isMuted = function (ret)
	{
	    var isMute;
		if (!this.youtube_player || !this.youtube_player["isMuted"])
		    isMute = false;
		else
		    isMute = this.youtube_player["isMuted"]() || false;
		    
		return isMute;
	};	    
	instanceProto.saveToJSON = function ()
	{    
		return { "videoId": this.cur_videoId,
		         "isAutoPlay": this.cur_isAutoPlay,
		         "playBackTime": this.get_playbackTime(),
		         "isLooping": this.cur_isLooping,   
		         "isMute": this.isMuted(),		         
		         "vol": this.get_volume(),
		         "isPlaying": (this.youtube_state === 1),
		         "isPaused": (this.youtube_state === 2)
		         };
	};
	
	instanceProto.loadFromJSON = function (o)
	{   
        this.pended_cmds.length = 0;
        
        this.LoadVideoID(o["videoId"], o["isAutoPlay"]);
        this.SetPlaybackTime(o["playBackTime"]);
        this.SetLooping(o["isLooping"]);
        this.SetMuted(o["isMute"]);
        this.SetVolume(o["vol"]);
        
        if (o["isPlaying"])
            this.Play();
        if (o["isPaused"])
            this.Pause();    
	};    
	//////////////////////////////////////
	// Conditions
    function Cnds() {};
	pluginProto.cnds = new Cnds();  
	
	Cnds.prototype.IsPlaying = function ()  
	{
		if (this.runtime.isDomFree)
			return false;
            
		if (!this.youtube_player || !this.youtube_player["getPlayerState"])
		    return false;
  
	    return (this.youtube_player["getPlayerState"]() === window["YT"]["PlayerState"]["PLAYING"]);
	};
	
	Cnds.prototype.IsPaused = function ()
	{
		if (this.runtime.isDomFree)
			return false;
            
		if (!this.youtube_player || !this.youtube_player["getPlayerState"])
		    return false;
		    	    
	    return (this.youtube_player["getPlayerState"]() === window["YT"]["PlayerState"]["PAUSED"]);
	};
	
	Cnds.prototype.HasEnded = function ()
	{
		if (this.runtime.isDomFree)
			return false;
            
		if (!this.youtube_player || !this.youtube_player["getPlayerState"])
		    return false;
		    	    
	    return (this.youtube_player["getPlayerState"]() === window["YT"]["PlayerState"]["ENDED"]);
	};
	
	Cnds.prototype.IsMuted = function ()
	{
		if (this.runtime.isDomFree)
			return false;
            
		if (!this.youtube_player || !this.youtube_player["getPlayerState"])
		    return false;
		    
		return this.youtube_player["isMuted"]();
	};
	
	Cnds.prototype.OnPlaybackEvent = function (state)
	{
	    var s;
	    switch (this.youtube_state)
	    {
	    case -1:  s=0; break;  //Unstarted
	    case  0:  s=1; break;  //Ended
	    case  1:  s=2; break;  //Playing
	    case  2:  s=3; break;  //Paused	
	    case  3:  s=4; break;  //Buffering
	    case  5:  s=5; break;  //Video cued	    	        
	    }
		return (s === state);
	};

	Cnds.prototype.ComparePlaybackTime = function (cmp, s)
	{
		if (this.runtime.isDomFree)
			return false;
            
		return cr.do_cmp(this.get_playbackTime(), cmp, s);
	};
	
	Cnds.prototype.OnPlayerReady = function ()
	{   
	    return true;
	};	
	
	Cnds.prototype.OnPlayerError = function ()
	{
		return true;
	};	
	//////////////////////////////////////
	// Actions
	function Acts() {};
	pluginProto.acts = new Acts();

	Acts.prototype.LoadVideoID = function (videoId, is_autoplay)
	{	    
		if (this.runtime.isDomFree)
			return;
            
	    this.LoadVideoID(videoId, (is_autoplay === 1));
	};
	
	Acts.prototype.SetPlaybackTime = function (s)
	{	
		if (this.runtime.isDomFree)
			return;
            
	    this.SetPlaybackTime(s);
	};
	
	Acts.prototype.SetLooping = function (l)
	{
		if (this.runtime.isDomFree)
			return;
            
	    this.SetLooping(l===1);
	};
	
	Acts.prototype.SetMuted = function (m)
	{
		if (this.runtime.isDomFree)
			return;
            
	    this.SetMuted(m === 1);
	};
	
	Acts.prototype.SetVolume = function (vol)
	{
		if (this.runtime.isDomFree)
			return;
            
	    this.SetVolume(vol);   
	};
	
	Acts.prototype.Pause = function ()
	{
		if (this.runtime.isDomFree)
			return;
            
	    this.Pause();
	};
	
	Acts.prototype.Play = function ()
	{
		if (this.runtime.isDomFree)
			return;
            
	    this.Play();
	};
	
	Acts.prototype.ResizeFullWindow = function ()
	{
		if (this.runtime.isDomFree)
			return;
            
	    this.x = this.layer.viewLeft;
	    this.y = this.layer.viewTop;
	    this.width = this.layer.viewRight - this.layer.viewLeft;
	    this.height = this.layer.viewBottom - this.layer.viewTop;
	    this.updatePosition();
	};	
	
	Acts.prototype.ResizeFullScreen = function ()
	{
		if (this.runtime.isDomFree)
			return;
            
        var requestFullScreen = this.elem.requestFullScreen || this.elem.mozRequestFullScreen || this.elem.webkitRequestFullScreen;
        if (requestFullScreen)        
            requestFullScreen.bind(this.elem)();
	};
    
	Acts.prototype.SetVisible = function (vis)
	{        
		if (this.runtime.isDomFree)
			return;
		
		this.visible = (vis !== 0);
	};    
	//////////////////////////////////////
	// Expressions
	function Exps() {};
	pluginProto.exps = new Exps();
	
	Exps.prototype.PlaybackTime = function (ret)
	{
		if (this.runtime.isDomFree)
		{
			ret.set_float(0);
			return;
		}
        
		ret.set_float( this.get_playbackTime() );
	};
	
	Exps.prototype.Duration = function (ret)
	{
		if (this.runtime.isDomFree)
		{
			ret.set_float(0);
			return;
		}
        
		ret.set_float( this.get_duration() );
	};
	
	Exps.prototype.Volume = function (ret)
	{
		if (this.runtime.isDomFree)
		{
			ret.set_float(0);
			return;
		}
        
		ret.set_float( this.get_volume() );
	};
	
	Exps.prototype.ErrorCode = function (ret)
	{
		if (this.runtime.isDomFree)
		{
			ret.set_float(0);
			return;
		}
        
		ret.set_float(this.exp_errorCode);
	};
	
	Exps.prototype.VideoState = function (ret)
	{
		if (this.runtime.isDomFree)
		{
			ret.set_string("");
			return;
		}
        
        var state = "";
	    switch (this.youtube_state)
	    {
	    case -1:  state="Unstarted"; break;
	    case  0:  state="Ended";     break;
	    case  1:  state="Playing";   break;
	    case  2:  state="Paused";    break;
	    case  3:  state="Buffering"; break;
	    case  5:  state="Video cued"; break;  	        
	    }
		ret.set_string(state);
	};

	
}());