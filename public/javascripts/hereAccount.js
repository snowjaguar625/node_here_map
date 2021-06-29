/**
 * @author krishnan
 */


var hereAccount=null;
var rootUrl = null;
var hideLogout = null;
var message="Please wait...";
var checkEmail = false;


function checkLoggedIn()
{
	if(hideLogout == "true")
	{
		document.getElementById("logoutButton").style.display="none";
	}
}		

function checkAuth()
{
	checkEmail = true;
	hereAccount.openSignIn();
}

function openLogin()
{
	// Only open login if already not logged in
	if (hideLogout == "false") 
	{
		hereAccount.openSignIn();
	}
	else
	{
		document.getElementById("logoutButton").style.display="block";
		window.location.href = document.getElementById("redirect").href;
	}
}	
		
function logOut()
{
	hereAccount.signOut();
	//window.location.href = rootUrl;
}

function initLogin(id,environment,type,lang,signInScreenConfig,url,logout)
{
	hereAccount= new here.Account(
	{
		node : document.getElementById('frame-container'),
		version : 4,
		clientId : id,
		environment : environment,
		type : type,
		uatDuration: 259200, // 3 days
		callback:
			function(err, data) 
			{
				if (!data || !data.data || !data.data.userId) 
				{
					if(data.flow == "sign-out"){
						var msgEl = document.getElementById("message");
						if(msgEl){
							msgEl.innerHTML = message;
						}
						setTimeout(
							() => {
								window.location.href = rootUrl;
							},
							500
						);
					}
				}
				else
				{
					// only for /bosch/filter_signs page
					// *here.com, *de.bosch.com and *.jaguarlandrover.com are allowed to access this pages. 
					if(checkEmail){
						var patt = /@[a-z.]*bosch.com/i;
						var patt1 = /@here.com/i;
						// var patt2 = /@jaguarlandrover.com/i;
						var n = data.data.email.search(patt) +  data.data.email.search(patt1); // + data.data.email.search(patt2);
						
						if( n < 0) 
						{
							alert("Not Authorized, please contact TCS Support. Your EmailId : "+data.data.email);
							window.location.href = rootUrl;
						}
						else
						{
							initSelects();
						}
					}
					else
					{
						if(document.getElementById("message"))
							document.getElementById("message").innerHTML=message;
						document.getElementById("logoutButton").style.display="block";
						window.location.href = document.getElementById("redirect").href;
					}
				}
			},
			lang:            lang,
			signInScreenConfig: [signInScreenConfig],
	});	
	rootUrl = url;
	hideLogout = logout;
}
