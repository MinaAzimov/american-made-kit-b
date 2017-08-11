  setInterval(countdown, 1000);

            function pad(num, size) {
              var s = "000" + num;
              return s.substr(s.length-size);
            }

            function countdown() {
              var grad = new Date('September 29, 2017 11:13:00');
              var now = new Date();
              var dur = moment.duration(grad.getTime() - now.getTime());


              var a = moment('09/29/2017','MM/DD/YYYY');
              var b = moment().format('YYYYMMDDTHHmm');
              var diffDays = a.diff(b, 'days');

              var days = pad(dur.days(), 2);
              var hours = pad(dur.hours(), 2);
              var minutes = pad(dur.minutes(), 2);
              var seconds = pad(dur.seconds(), 2);
              var milliseconds = pad(dur.milliseconds(), 3);


              $('.days').find('h2').text(diffDays);
              $('.hours').find('h2').text(hours);
              $('.minutes').find('h2').text(minutes);
              $('.seconds').find('h2').text(seconds);
            }
