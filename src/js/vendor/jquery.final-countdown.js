setInterval(time_timer, 1000);

function time_timer() {
  var dt = new Date();
  
  var s = dt.getSeconds();
  var s_p = ((s/60) * 100) + '%'; 
  
  var m = dt.getMinutes();
  var m_p = ((m/60) * 100) + '%';
  
  var h = dt.getHours();
  var h_p = ((h/24) * 100) + '%';
  
  $('.hour').find('p').text(h);
  $('.minute').find('p').text(m);
  $('.second').find('p').text(s);
                              
   TweenMax.to($('.second'), 0.5, {
      ease: Bounce.easeOut,
      width:s_p,
  })
    TweenMax.to($('.minute'), 0.5, {
      ease: Bounce.easeOut,
      width:m_p,
  })
     TweenMax.to($('.hour'), 0.5, {
      ease: Bounce.easeOut,
      width:h_p,
  })
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ2ZW5kb3IvanF1ZXJ5LmZpbmFsLWNvdW50ZG93bi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJzZXRJbnRlcnZhbCh0aW1lX3RpbWVyLCAxMDAwKTtcblxuZnVuY3Rpb24gdGltZV90aW1lcigpIHtcbiAgdmFyIGR0ID0gbmV3IERhdGUoKTtcbiAgXG4gIHZhciBzID0gZHQuZ2V0U2Vjb25kcygpO1xuICB2YXIgc19wID0gKChzLzYwKSAqIDEwMCkgKyAnJSc7IFxuICBcbiAgdmFyIG0gPSBkdC5nZXRNaW51dGVzKCk7XG4gIHZhciBtX3AgPSAoKG0vNjApICogMTAwKSArICclJztcbiAgXG4gIHZhciBoID0gZHQuZ2V0SG91cnMoKTtcbiAgdmFyIGhfcCA9ICgoaC8yNCkgKiAxMDApICsgJyUnO1xuICBcbiAgJCgnLmhvdXInKS5maW5kKCdwJykudGV4dChoKTtcbiAgJCgnLm1pbnV0ZScpLmZpbmQoJ3AnKS50ZXh0KG0pO1xuICAkKCcuc2Vjb25kJykuZmluZCgncCcpLnRleHQocyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgIFR3ZWVuTWF4LnRvKCQoJy5zZWNvbmQnKSwgMC41LCB7XG4gICAgICBlYXNlOiBCb3VuY2UuZWFzZU91dCxcbiAgICAgIHdpZHRoOnNfcCxcbiAgfSlcbiAgICBUd2Vlbk1heC50bygkKCcubWludXRlJyksIDAuNSwge1xuICAgICAgZWFzZTogQm91bmNlLmVhc2VPdXQsXG4gICAgICB3aWR0aDptX3AsXG4gIH0pXG4gICAgIFR3ZWVuTWF4LnRvKCQoJy5ob3VyJyksIDAuNSwge1xuICAgICAgZWFzZTogQm91bmNlLmVhc2VPdXQsXG4gICAgICB3aWR0aDpoX3AsXG4gIH0pXG59Il0sImZpbGUiOiJ2ZW5kb3IvanF1ZXJ5LmZpbmFsLWNvdW50ZG93bi5qcyJ9
