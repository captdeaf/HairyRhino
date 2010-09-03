#!/usr/bin/ruby
#

logfile=File.dirname($0) + '/log.out'

unless File.exists?(logfile)
  STDERR.puts "Can't find log file: '#{logfile}'"
  exit
end

require 'socket'
$ipmap = {}
def ipname(ip)
  unless $ipmap.has_key?(ip)
    dig=`dig -x #{ip}`.split(/\n+/).grep(/^\d.*?PTR\s*(\S+)/)
    if dig && dig.any?
      dig[0] =~ /PTR\s*(\S+)/
      name = $1
      $ipmap[ip] = "#{ip} (#{name})"
    else
      $ipmap[ip] = "#{ip} (Does not resolve)"
    end
  end
  return $ipmap[ip]
end

allsites = {}

# Check yesterday
date = Time.at(Time.now - 72000).to_s.split(/\s+/,4)[0,3].join(' ')

puts "Statistics for: #{date}"
puts
puts

allhits = []

File.open(logfile, 'r') do |fin|
  while s = fin.gets
    next unless s =~ /^LOG \[#{date}.*?\]/
    allhits.push(s)
  end
end

allhits.each do |i|
  i.chomp!
  if (i =~ /LOG \[(.*?)\] (\d+\.\d+\.\d+\.\d+):(.+): (\{.*?\})$/)
    datetime, ip, url, args = $1, $2, $3, $4
    url =~ /https?:\/\/((?:\w+\.)?(\w+\.\w+)\.*)\//
    fulldomain = $1.downcase
    domain = $2.downcase
    allsites[domain] ||= []
    allsites[domain].push({
      :datetime => datetime,
      :ip => ip,
      :url => url,
      :args => args,
      :fulldomain => fulldomain,
      :domain => domain
    })
  else
    STDERR.puts "Unrecognizable log line: #{i}"
  end
end

allsites.keys.sort.each do |dname|
  hits = allsites[dname]
  # Determine display name.
  allnames = hits.map { |i| i[:fulldomain] }
  displayname = allnames.uniq.sort_by { |i| allnames.select{ |j| i ==  j }.size }[0]
  puts "Stats for #{displayname}:"

  puts "Total # of hits: #{hits.size}"

  allips = hits.map { |i| i[:ip] }
  topips = allips.uniq.sort_by { |i| allips.select{|j| j == i}.size }.reverse
  puts "Total # of unique IPs: #{topips.size}"

  allurls = hits.map { |i| i[:url] }
  topurls = allurls.uniq.sort_by { |i| allurls.select{|j| j == i}.size }.reverse
  puts "Total # of unique urls: #{topurls.size}"

  topcount = 20
  if topurls.size < topcount
    topcount = topurls.size
  end
  puts
  puts "Top #{topcount} urls: (20 max)"
  topurls[0,topcount].each do |url|
    puts '  ' + allurls.grep(url).size.to_s.rjust(5) + ' ' + url
  end

  topcount = 20
  if topips.size < topcount
    topcount = topips.size
  end
  puts
  puts "Top #{topcount} ips: (20 max)"
  topips[0,topcount].each do |ip|
    puts '  ' + allips.grep(ip).size.to_s.rjust(5) + ' ' + ipname(ip)
  end

  scrapers = topips.sort_by { |ip|
    hits.select { |hit| hit[:ip] == ip }.map { |hit| hit[:url] + ' ' + hit[:args] }.uniq.size
  }.reverse

  topcount = 20
  if (scrapers.size < topcount)
    topcount = scrapers.size
  end
  puts
  puts "Top #{topcount} IPs, sorted by # of urls hit, and random sample of urls:"
  scrapers[0,topcount].each do |ip|
    allurls = hits.select { |hit| hit[:ip] == ip }.map { |hit| hit[:url] + ' ' + hit[:args] }.uniq
    allurls = allurls.sort_by { rand }
    puts '  ' + allurls.size.to_s.rjust(5) + ' ' + ipname(ip)
    allurls[0,5].each do |url|
      puts '    ' + url
    end
  end

  puts
  puts
  puts
end
