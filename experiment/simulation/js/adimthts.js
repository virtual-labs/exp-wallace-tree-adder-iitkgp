/**
 This Scrtpt file is developed by
Aditya Kameswara Rao Nandula
Senior Project Scientist,
Virtual Labs IIT Kharagpur.
LinkedIn: https://in.linkedin.com/in/akraonandula/
 */

$(document).ready(function () {
  $(".labn").load("../../LabName.txt", function(responseTxt, statusTxt, xhr){
    if(statusTxt == "success"){
	  $('.labn').html(responseTxt);
	}
    if(statusTxt == "error"){
    $('.labn').html(fn+ " Error: " + xhr.status + ": " + xhr.statusText);
  }
  });
  $(".exn").load("../ExpName.txt", function(responseTxt, statusTxt, xhr){
    if(statusTxt == "success"){
	  $('.exn').html(responseTxt);
	}
    if(statusTxt == "error"){
    $('.exn').html(fn+ " Error: " + xhr.status + ": " + xhr.statusText);
    }
  });
});
